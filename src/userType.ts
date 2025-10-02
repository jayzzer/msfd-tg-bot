import { InlineKeyboardButton } from "grammy/types";

export type UserType =
  | "designer"
  | "expert"
  | "model"
  | "artist"
  | "participant";

export const USER_TYPES: Record<UserType, { label: string }> = {
  designer: {
    label: "Дизайнер",
  },
  expert: {
    label: "Эксперт",
  },
  model: {
    label: "Модель",
  },
  artist: {
    label: "Артист",
  },
  participant: {
    label: "Участник",
  },
};
const USER_TYPE_INLINE_KEYBOARD_BUTTONS_LAYOUT: UserType[][] = [
  ["designer"],
  ["expert"],
  ["model"],
  ["artist"],
  ["participant"],
];

export const USER_TYPE_INLINE_KEYBOARD_BUTTONS: InlineKeyboardButton[][] =
  USER_TYPE_INLINE_KEYBOARD_BUTTONS_LAYOUT.map<InlineKeyboardButton[]>((columns) =>
    columns.map<InlineKeyboardButton>((column) => {
      const foundUserType = USER_TYPES[column];
      return {
        text: foundUserType.label,
        callback_data: column,
      };
    })
  );
