import {
  Conversation,
  conversations,
  createConversation,
  type ConversationFlavor,
} from "@grammyjs/conversations";
import "dotenv/config";
import * as fs from "fs";
import {
  Bot,
  InputFile,
  session,
  type Context,
  type SessionFlavor,
} from "grammy";
import { nanoid } from "nanoid";
import * as os from "os";
import * as path from "path";
import {
  FORMAT_INLINE_KEYBOARD_BUTTONS,
  FORMAT_TYPES,
  FormatType,
} from "./format";
import { processImage } from "./image-processor";
import { masks } from "./masks";
import type { BotSession } from "./types";
import {
  USER_TYPE_INLINE_KEYBOARD_BUTTONS,
  USER_TYPES,
  UserType,
} from "./userType";

const BOT_TOKEN = process.env.BOT_TOKEN || "";

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is required");
  process.exit(1);
}

type MyContext = SessionFlavor<BotSession> & ConversationFlavor<Context>;
type MyConversationContext = Context;
type MyConversation = Conversation<MyContext, MyConversationContext>;

const bot = new Bot<MyContext>(BOT_TOKEN);

bot.use(
  session({
    initial(): BotSession {
      return {
        imagePath: "",
        selectedType: null,
        selectedFormat: null,
      };
    },
  })
);

bot.use(conversations());

async function conversation(
  conversation: MyConversation,
  ctx: MyConversationContext
) {
  const session = await conversation.external((ctx) => ctx.session);

  await ctx.reply("Выберите ваш статус участия", {
    reply_markup: {
      inline_keyboard: USER_TYPE_INLINE_KEYBOARD_BUTTONS,
    },
  });
  const userTypeSelection = await conversation.waitFor("callback_query:data", {
    otherwise: (ctx) =>
      ctx.reply("Пожалуйста, выберите один из статусов участия."),
  });
  const selectedUserType = userTypeSelection.callbackQuery.data as UserType;

  session.selectedType = selectedUserType;
  await conversation.external((ctx) => {
    ctx.session = session;
  });

  await userTypeSelection.answerCallbackQuery({
    text: `Вы выбрали ${USER_TYPES[selectedUserType].label}`,
  });

  await ctx.reply("Отлично! Теперь отправьте мне вашу фотографию.");
  const imageMsg = await conversation.waitFor(":photo", {
    otherwise: (ctx) =>
      ctx.reply("Это не изображение. Пожалуйста, пришлите изображение."),
  });
  if (!imageMsg.message?.photo) return;

  const photo = imageMsg.message.photo[imageMsg.message.photo.length - 1];
  const fileId = photo.file_id;

  const uploading = await ctx.reply("Загружаю ваше изображение...");

  const file = await ctx.api.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tg-mask-"));
  const imagePath = path.join(tempDir, "original.jpg");

  const response = await fetch(fileUrl);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(imagePath, Buffer.from(buffer));

  session.imagePath = imagePath;
  await conversation.external((ctx) => {
    ctx.session = session;
  });

  await ctx.reply(
    "Выберите размер изображения.\n" +
      "Вертикальная картинка отлично подойдет для сторис, а квадратная — для поста в соцсетях:",
    {
      reply_markup: {
        inline_keyboard: FORMAT_INLINE_KEYBOARD_BUTTONS,
      },
    }
  );

  await conversation.external((ctx) => {
    setTimeout(() => {
      ctx.api.deleteMessage(uploading.chat.id, uploading.message_id);
    }, 100);
  });

  const formatSelection = await conversation.waitFor("callback_query:data");

  const formatType = formatSelection.callbackQuery.data as FormatType;
  session.selectedFormat = formatType;
  await conversation.external((ctx) => {
    ctx.session = session;
  });

  await formatSelection.answerCallbackQuery({
    text: `Вы выбрали формат: ${FORMAT_TYPES[formatType]}`,
  });

  const creating = await ctx.reply(
    `Создаю изображение, буквально пару секунд...`
  );

  try {
    const selectedMask = masks[session.selectedType];
    const formats: FormatType[] =
      formatType === "both" ? ["stories", "square"] : [formatType];
    const outputs = formats.map((format) => ({
      path: path.join(tempDir, nanoid(8)),
      format: {
        width: 1080,
        height: format === "stories" ? 1920 : 1080,
      },
    }));

    await Promise.all(
      outputs.map((output) =>
        processImage(
          session.imagePath,
          selectedMask,
          output.format,
          output.path
        )
      )
    );

    await ctx.replyWithMediaGroup(
      outputs.map((output) => ({
        type: "photo",
        media: new InputFile(output.path),
      }))
    );
    await ctx.reply(`Готово! Вот ваше изображение.`);

    await conversation.external((ctx) => {
      setTimeout(() => {
        ctx.api.deleteMessage(creating.chat.id, creating.message_id);
      }, 100);
    });

    await ctx.reply(
      "Нажмите /start, чтобы отправить другое фото или изменить формат картинки."
    );

    try {
      fs.unlinkSync(imagePath);
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error("Error cleaning up temp files:", e);
    }
  } catch (error) {
    console.error("Error processing image:", error);
    await ctx.reply(
      "Sorry, there was an error processing your image. Please try again."
    );
  }
}

const CONVERSATION_NAME = "conversation";

bot.use(createConversation(conversation, CONVERSATION_NAME));

bot.command("start", async (ctx) => {
  await ctx.conversation.enter(CONVERSATION_NAME);
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "Как использовать этого бота:\n" +
      "1. Нажмите /start и отправьте фото\n" +
      "2. Выберите размер изображения из предложенных вариантов\n" +
      "3. Получите готовую картинку для поста или сторис\n\n" +
      "Поддерживаемые форматы: JPG, PNG, WEBP, HEIC и другие"
  );
});

bot.api.setMyCommands([
  { command: "start", description: "запустить бот" },
  { command: "help", description: "узнать, как пользоваться ботом" },
]);

bot.on("message:photo", async (ctx) => {
  await ctx.reply(
    "Сначала необходимо вызвать команду /start для начала работы"
  );
});

bot.catch((err) => {
  console.error("Bot error:", err);
});

bot.start({
  onStart: (botInfo) => {
    console.log(`Bot @${botInfo.username} started! 🚀`);
    console.log("Send /start to begin using the bot");
  },
});
