import { PrismaClient } from '@prisma/client';

// 创建 Prisma 客户端实例
const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    // 尝试连接数据库
    console.log('正在测试数据库连接...');
    
    // 执行一个简单查询来测试连接
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    
    console.log('数据库连接成功!', result);
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error);
    return false;
  } finally {
    // 关闭数据库连接
    await prisma.$disconnect();
  }
}

// 执行测试
testDatabaseConnection()
  .then(isConnected => {
    if (isConnected) {
      console.log('✅ 数据库连接测试通过');
      process.exit(0);
    } else {
      console.log('❌ 数据库连接测试失败');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('执行测试时发生错误:', error);
    process.exit(1);
  }); 