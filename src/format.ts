import { InlineKeyboardButton } from "grammy/types";

export type FormatType = "stories" | "square" | "both";

export const FORMAT_TYPES: Record<FormatType, { label: string }> = {
  stories: {
    label: "Сторис 9x16",
  },
  square: {
    label: "Пост 1x1",
  },
  both: {
    label: "Сторис + Пост",
  },
};
const FORMAT_INLINE_KEYBOARD_BUTTONS_LAYOUT: FormatType[][] = [
  ["stories", "square"],
  ["both"],
];

export const FORMAT_INLINE_KEYBOARD_BUTTONS: InlineKeyboardButton[][] =
  FORMAT_INLINE_KEYBOARD_BUTTONS_LAYOUT.map<InlineKeyboardButton[]>((columns) =>
    columns.map<InlineKeyboardButton>((column) => {
      const foundUserType = FORMAT_TYPES[column];
      return {
        text: foundUserType.label,
        callback_data: column,
      };
    })
  );
