import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { TrpcService } from '@server/trpc/trpc.service';
import { feedMimeTypeMap, feedTypes } from '@server/constants';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@server/configuration';
import { Feed, Item } from 'feed';
import got, { Got } from 'got';
import { load } from 'cheerio';
import { minify } from 'html-minifier';
import { LRUCache } from 'lru-cache';
import pMap from '@cjs-exporter/p-map';
import { DatabaseService } from '@server/database/database.service';

console.log('CRON_EXPRESSION: ', process.env.CRON_EXPRESSION);

const mpCache = new LRUCache<string, string>({
  max: 5000,
});

@Injectable()
export class FeedsService {
  private readonly logger = new Logger(this.constructor.name);

  private request: Got;
  constructor(
    private readonly prismaService: PrismaService,
    private readonly trpcService: TrpcService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    this.logger.log('FeedsService 初始化');
    this.request = got.extend({
      retry: {
        limit: 3,
        methods: ['GET'],
      },
      timeout: 8 * 1e3,
      headers: {
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'max-age=0',
        'sec-ch-ua':
          '" Not A;Brand";v="99", "Chromium";v="101", "Google Chrome";v="101"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36',
      },
      hooks: {
        beforeRetry: [
          async (options, error, retryCount) => {
            this.logger.warn(`retrying ${options.url}...`);
            return new Promise((resolve) =>
              setTimeout(resolve, 2e3 * (retryCount || 1)),
            );
          },
        ],
      },
    });
  }

  @Cron(process.env.CRON_EXPRESSION || '35 5,17 * * *', {
    name: 'updateFeeds',
    timeZone: 'Asia/Shanghai',
  })
  async handleUpdateFeedsCron() {
    this.logger.debug('Called handleUpdateFeedsCron');

    const feeds = await this.databaseService.getAllFeeds(1);
    this.logger.debug('feeds length:' + feeds.length);

    const updateDelayTime =
      this.configService.get<ConfigurationType['feed']>(
        'feed',
      )!.updateDelayTime;

    for (const feed of feeds) {
      this.logger.debug('feed', feed.id);
      try {
        await this.trpcService.refreshMpArticlesAndUpdateFeed(feed.id);

        await new Promise((resolve) =>
          setTimeout(resolve, updateDelayTime * 1e3),
        );
      } catch (err) {
        this.logger.error('handleUpdateFeedsCron error', err);
      } finally {
        // wait 30s for next feed
        await new Promise((resolve) => setTimeout(resolve, 30 * 1e3));
      }
    }
  }

  async cleanHtml(source: string) {
    const $ = load(source, { decodeEntities: false });

    const dirtyHtml = $.html($('.rich_media_content'));

    const html = dirtyHtml
      .replace(/data-src=/g, 'src=')
      .replace(/opacity: 0( !important)?;/g, '')
      .replace(/visibility: hidden;/g, '');

    const content =
      '<style> .rich_media_content {overflow: hidden;color: #222;font-size: 17px;word-wrap: break-word;-webkit-hyphens: auto;-ms-hyphens: auto;hyphens: auto;text-align: justify;position: relative;z-index: 0;}.rich_media_content {font-size: 18px;}</style>' +
      html;

    const result = minify(content, {
      removeAttributeQuotes: true,
      collapseWhitespace: true,
    });

    return result;
  }

  async getHtmlByUrl(url: string) {
    const html = await this.request(url, { responseType: 'text' }).text();
    if (
      this.configService.get<ConfigurationType['feed']>('feed')!.enableCleanHtml
    ) {
      const result = await this.cleanHtml(html);
      return result;
    }

    return html;
  }

  async tryGetContent(id: string) {
    let content = mpCache.get(id);
    if (content) {
      return content;
    }
    const url = `https://mp.weixin.qq.com/s/${id}`;
    content = await this.getHtmlByUrl(url).catch((e) => {
      this.logger.error(`getHtmlByUrl(${url}) error: ${e.message}`);

      return '获取全文失败，请重试~';
    });
    mpCache.set(id, content);
    return content;
  }

  async renderFeed({
    type,
    feedInfo,
    articles,
    mode,
  }: {
    type: string;
    feedInfo: any;
    articles: any[];
    mode?: string;
  }) {
    const { originUrl, mode: globalMode } =
      this.configService.get<ConfigurationType['feed']>('feed')!;

    const link = `${originUrl}/feeds/${feedInfo.id}.${type}`;

    const feed = new Feed({
      title: feedInfo.mpName || feedInfo.mp_name,
      description: feedInfo.mpIntro || feedInfo.mp_intro,
      id: link,
      link: link,
      language: 'zh-cn',
      image: feedInfo.mpCover || feedInfo.mp_cover,
      favicon: feedInfo.mpCover || feedInfo.mp_cover,
      copyright: '',
      updated: new Date((feedInfo.updateTime || feedInfo.update_time) * 1e3),
      generator: 'WeWe-RSS',
      author: { name: feedInfo.mpName || feedInfo.mp_name },
    });

    feed.addExtension({
      name: 'generator',
      objects: `WeWe-RSS`,
    });

    // 从databaseService获取feeds列表，而不是从prismaService
    const feedsData = await this.databaseService.getAllFeeds();
    // 确保兼容不同字段命名
    const feeds = feedsData.map(feed => ({
      id: feed.id,
      mpName: feed.mpName || feed.mp_name
    }));

    /**mode 高于 globalMode。如果 mode 值存在，取 mode 值*/
    const enableFullText =
      typeof mode === 'string'
        ? mode === 'fulltext'
        : globalMode === 'fulltext';

    const showAuthor = feedInfo.id === 'all';

    const mapper = async (item) => {
      const { title, id, publishTime, picUrl, mpId } = item;
      // 兼容不同字段名格式
      const actualTitle = title || item.title;
      const actualId = id || item.id;
      const actualPublishTime = publishTime || item.publish_time;
      const actualPicUrl = picUrl || item.pic_url;
      const actualMpId = mpId || item.mp_id;
      
      const link = `https://mp.weixin.qq.com/s/${actualId}`;

      // 在这里使用databaseService而不是prismaService
      let mpName = '-';
      if (showAuthor) {
        // 遍历缓存的feeds列表，找到匹配的名称
        const feed = feeds.find((f) => f.id === actualMpId || f.id === mpId);
        mpName = feed ? feed.mpName : '-';
      }
      
      const published = new Date(actualPublishTime * 1e3);

      let content = '';
      if (enableFullText) {
        content = await this.tryGetContent(actualId);
      }

      feed.addItem({
        id: actualId,
        title: actualTitle,
        link: link,
        guid: link,
        content,
        date: published,
        image: actualPicUrl,
        author: showAuthor ? [{ name: mpName }] : undefined,
      });
    };

    await pMap(articles, mapper, { concurrency: 2, stopOnError: false });

    return feed;
  }

  async handleGenerateFeed({
    id,
    type,
    limit,
    page,
    mode,
    title_include,
    title_exclude,
  }: {
    id?: string;
    type: string;
    limit: number;
    page: number;
    mode?: string;
    title_include?: string;
    title_exclude?: string;
  }) {
    if (!feedTypes.includes(type as any)) {
      type = 'atom';
    }

    let articles: any[] = [];
    let feedInfo: any;
    if (id) {
      // 使用databaseService获取Feed
      feedInfo = await this.databaseService.getFeed(id);

      if (!feedInfo) {
        throw new HttpException('不存在该feed！', HttpStatus.BAD_REQUEST);
      }

      // 使用databaseService获取文章列表
      articles = await this.databaseService.getArticlesByFeedId(id, limit);
    } else {
      // 使用databaseService获取所有文章
      articles = await this.databaseService.getArticles({ 
        limit: limit,
        mpId: undefined
      });

      const { originUrl } =
        this.configService.get<ConfigurationType['feed']>('feed')!;
      feedInfo = {
        id: 'all',
        mpName: 'WeWe-RSS All',
        mpIntro: 'WeWe-RSS 全部文章',
        mpCover: originUrl
          ? `${originUrl}/favicon.ico`
          : 'https://r2-assets.111965.xyz/wewe-rss.png',
        status: 1,
        syncTime: 0,
        updateTime: Math.floor(Date.now() / 1e3),
        hasHistory: -1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    this.logger.log('handleGenerateFeed articles: ' + articles.length);
    const feed = await this.renderFeed({ feedInfo, articles, type, mode });

    if (title_include) {
      const includes = title_include.split('|');
      feed.items = feed.items.filter((i: Item) =>
        includes.some((k) => i.title.includes(k)),
      );
    }
    if (title_exclude) {
      const excludes = title_exclude.split('|');
      feed.items = feed.items.filter(
        (i: Item) => !excludes.some((k) => i.title.includes(k)),
      );
    }

    switch (type) {
      case 'rss':
        return { content: feed.rss2(), mimeType: feedMimeTypeMap[type] };
      case 'json':
        return { content: feed.json1(), mimeType: feedMimeTypeMap[type] };
      case 'atom':
      default:
        return { content: feed.atom1(), mimeType: feedMimeTypeMap[type] };
    }
  }

  async getFeedList() {
    const data = await this.databaseService.getAllFeeds();

    return data.map((item) => {
      return {
        id: item.id,
        name: item.mpName,
        intro: item.mpIntro,
        cover: item.mpCover,
        syncTime: item.syncTime,
        updateTime: item.updateTime,
      };
    });
  }

  async updateFeed(id: string) {
    try {
      await this.trpcService.refreshMpArticlesAndUpdateFeed(id);
    } catch (err) {
      this.logger.error('updateFeed error', err);
    } finally {
      // wait 30s for next feed
      await new Promise((resolve) => setTimeout(resolve, 30 * 1e3));
    }
  }
}
