const { Telegraf, Markup } = require('telegraf');
const User = require('../models/user');
const Statistics = require('../classes/Statistics');
require('dotenv').config();

const {
  TOKEN,
  URL,
  CHAT_ID,
  GROUP_LINK,
  BOT_LINK,
} = process.env;

const langs = {
  not_subscribe: 'Ой, кажется, ты не подписан на наш канал. Чтобы участвовать в розыгрыше призов, подпишись канал Tanuki Family в Telegram.',
  hello_message: 'Привет! Хочешь получить призы от «Тануки»? Все предельно просто: заходи в игру, собирай бустеры, избегай препятствий и набери как можно больше очков. Пять лучших пользователей получат призы.\n\nУ тебя будет 10 попыток. Не переживай, каждый день они обновляются.\n\n1. Игра откроется не на весь экран. Нужно смахнуть вверх на мобильном устройстве, чтобы окно открылось полностью!\n2. Если игра не прогружается, проверь качество соединения или отключи VPN.\n3. Если кнопка играть не появляется сверху слева клавиатуры — обнови телеграм до последней версии',
  use_keyboard: 'Пожалуйста, используй кнопки.',
  subscribed: 'Я подписался!',
  more_attempts: 'Больше попыток',
  play: 'Играть',
  ref_link: 'Чтобы получить дополнительные попытки, нужно сделать одну маленькую хитрость. Копируй ссылку, отправляй другу и получай дополнительные жизни.\n\nТвоя уникальная реферальная ссылка:',
  ref_answer: 'Поздравляем, кто-то из твоих друзей воспользовался реферальной ссылкой! 5 попыток уже начислены на твой счет. Давай играть!',
};

const authedKeyboard = Markup.inlineKeyboard([
  Markup.button.webApp(langs.play, URL),
  Markup.button.callback(langs.more_attempts, 'moreattempts'),
]);

const notAthedKeyboard = Markup.inlineKeyboard([
  Markup.button.url('Tanuki Family', GROUP_LINK),
  Markup.button.callback('Я подписался!', 'checkuser'),
]);

const authAnswer = ctx => ctx.reply(langs.hello_message, { ...authedKeyboard }).catch(() => null);
const notAuthAnswer = ctx => ctx.reply(langs.not_subscribe, { ...notAthedKeyboard })
  .catch(() => null);

const checkUser = async (bot, userId) => {
  try {
    const data = await bot.telegram.getChatMember(CHAT_ID, userId);
    return data && data.status !== 'left';
  } catch (e) {
    return false;
  }
};

module.exports = () => {
  const bot = new Telegraf(TOKEN);

  bot.hears(/^\/start[ =](.+)$/, async ctx => {
    const ref = ctx.match[1];
    if (ref && await checkUser(bot, ref)) {
      const user = await User.findOne({ tgId: ref }).then(data => data);
      const userId = String(ctx.from.id);
      if (user && user.referrers.every(el => el !== userId)) {
        if (await checkUser(bot, userId)) {
          const newAttempts = user.attempts + 5;
          user.referrers.push(String(userId));
          User.updateOne({ tgId: ref }, {
            $set: { attempts: newAttempts, referrers: user.referrers },
          }).then(() => null);
          Statistics.addRefStarted(String(userId));
          bot.telegram.sendMessage(ref, langs.ref_answer, { ...authedKeyboard }).catch(() => null);
        } else {
          const time = Math.round(new Date().getTime() / 1000);
          User.create({
            tgId: ctx.from.id,
            name: ctx.from.first_name,
            time: time,
            refUser: String(ref),
          })
            .then(data => data);
        }
      }
    }
    Statistics.addBotStarted(String(ctx.from.id));
    if (await checkUser(bot, ctx.from.id)) return authAnswer(ctx);
    return notAuthAnswer(ctx);
  });

  bot.command('start', async ctx => {
    const tgId = String(ctx.from.id);
    Statistics.addBotStarted(tgId);
    const user = await User.findOne({ tgId: tgId }).then(data => data);

    if (!user) {
      const time = Math.round(new Date().getTime() / 1000);
      User.create({ tgId: tgId, name: ctx.from.first_name, time: time }).then(data => data);
    }

    if (await checkUser(bot, ctx.from.id)) return authAnswer(ctx);
    return notAuthAnswer(ctx);
  });

  bot.action('checkuser', async ctx => {
    ctx.deleteMessage().catch(() => null);
    await ctx.answerCbQuery().catch(() => null);
    if (await checkUser(bot, ctx.from.id)) {
      const userId = ctx.from.id;
      const user = await User.findOne({ tgId: userId }).then(data => data);
      if (user && user.refUser) {
        const refUser = await User.findOne({ tgId: user.refUser }).then(data => data);
        if (refUser && refUser.referrers.every(el => el !== userId)) {
          if (await checkUser(bot, userId)) {
            const newAttempts = user.attempts + 5;
            user.referrers.push(String(userId));
            User.updateOne({ tgId: user.refUser }, {
              $set: { attempts: newAttempts, referrers: user.referrers },
            }).then(() => null);
            Statistics.addRefStarted(String(userId));
            bot.telegram.sendMessage(user.refUser, langs.ref_answer, { ...authedKeyboard })
              .catch(() => null);
          }
        }
      }
      return authAnswer(ctx);
    }
    return notAuthAnswer(ctx);
  });

  bot.action('moreattempts', async ctx => {
    ctx.deleteMessage().catch(() => null);
    if (await checkUser(bot, ctx.from.id)) {
      await ctx.answerCbQuery().catch(() => null);
      return ctx.reply(`${langs.ref_link}${BOT_LINK}?start=${ctx.from.id}`, { ...authedKeyboard }).catch(() => null);
    }
    return notAuthAnswer(ctx);
  });

  bot.on('text', async ctx => {
    const check = await checkUser(bot, ctx.from.id);
    return ctx.reply(langs.use_keyboard, {
      ...check ? authedKeyboard : notAthedKeyboard,
    }).catch(() => null);
  });

  bot.launch();

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
};
