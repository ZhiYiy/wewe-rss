import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, loggerLink } from '@trpc/client';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { isTRPCClientError, trpc } from '../utils/trpc';
import { getAuthCode, setAuthCode } from '../utils/auth';
import { enabledAuthCode, serverOriginUrl } from '../utils/env';

export const TrpcProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // 检查服务器状态
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        // 简单的ping请求，检查服务器是否在线
        const response = await fetch(`${serverOriginUrl}/health`, { method: 'HEAD' })
          .catch(() => ({ ok: false, status: 0 }));
          
        if (response.ok || response.status === 404) {
          // 返回404也算服务器在线，只是端点不存在
          setServerStatus('online');
        } else {
          setServerStatus('offline');
          toast.error('无法连接到服务器', {
            description: '请确保服务器已启动并运行在正确的端口',
            duration: 5000,
          });
        }
      } catch (err) {
        setServerStatus('offline');
        toast.error('无法连接到服务器', {
          description: '请确保服务器已启动并运行在正确的端口',
          duration: 5000,
        });
      }
    };

    checkServerStatus();
    // 每30秒检查一次服务器状态
    const interval = setInterval(checkServerStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNoAuth = () => {
    if (enabledAuthCode) {
      setAuthCode('');
      navigate('/login');
    }
  };
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            refetchIntervalInBackground: false,
            retryDelay: (retryCount) => Math.min(retryCount * 1000, 60 * 1000),
            retry(failureCount, error) {
              console.log('failureCount: ', failureCount);
              if (isTRPCClientError(error)) {
                if (error.data?.httpStatus === 401) {
                  return false;
                }
              }
              // 增加重试次数以处理网络连接问题
              return failureCount < 5;
            },
            onError(error) {
              console.error('queries onError: ', error);
              if (isTRPCClientError(error)) {
                if (error.data?.httpStatus === 401) {
                  toast.error('无权限', {
                    description: error.message,
                  });

                  handleNoAuth();
                } else if (error.message.includes('Failed to fetch') || 
                          error.message.includes('connection refused') ||
                          error.message.includes('network')) {
                  // 特别处理网络连接错误
                  toast.error('服务器连接失败', {
                    description: '请确保服务器已启动并运行在正确的端口',
                    duration: 5000,
                  });
                  setServerStatus('offline');
                } else {
                  toast.error('请求失败!', {
                    description: error.message,
                  });
                }
              }
            },
          },
          mutations: {
            onError(error) {
              console.error('mutations onError: ', error);
              if (isTRPCClientError(error)) {
                if (error.data?.httpStatus === 401) {
                  toast.error('无权限', {
                    description: error.message,
                  });
                  handleNoAuth();
                } else if (error.message.includes('Failed to fetch') || 
                          error.message.includes('connection refused') ||
                          error.message.includes('network')) {
                  // 特别处理网络连接错误
                  toast.error('服务器连接失败', {
                    description: '请确保服务器已启动并运行在正确的端口',
                    duration: 5000,
                  });
                  setServerStatus('offline');
                } else {
                  toast.error('请求失败!', {
                    description: error.message,
                  });
                }
              }
            },
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({
          enabled: () => true,
        }),
        httpBatchLink({
          url: serverOriginUrl + '/trpc',
          async headers() {
            const token = getAuthCode();

            if (!token) {
              handleNoAuth();
              return {};
            }

            return token
              ? {
                  Authorization: `${token}`,
                }
              : {};
          },
        }),
      ],
    }),
  );
  
  // 如果服务器离线，显示离线状态提示
  if (serverStatus === 'offline') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-800">
        <div className="p-8 bg-white dark:bg-gray-700 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">服务器连接失败</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            无法连接到服务器。请检查：
          </p>
          <ul className="text-left text-gray-600 dark:text-gray-400 mb-6 list-disc pl-6">
            <li>服务器是否已启动 (npm run dev)</li>
            <li>服务器是否运行在正确的端口 (默认4000)</li>
            <li>环境配置是否正确 (.env文件中的VITE_SERVER_ORIGIN_URL)</li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            重新连接
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
};
