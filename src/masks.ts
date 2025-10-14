import path from "path";
import { UserType } from "./userType";

export interface MaskOption {
  path: string;
  scale?: number;
}

export const masks: Record<UserType, MaskOption> = {
  designer: {
    path: path.join(__dirname, "../assets/masks/designer.png"),
    scale: 1,
  },
  expert: {
    path: path.join(__dirname, "../assets/masks/expert.png"),
    scale: 1,
  },
  model: {
    path: path.join(__dirname, "../assets/masks/model.png"),
    scale: 1,
  },
  artist: {
    path: path.join(__dirname, "../assets/masks/artist.png"),
    scale: 1,
  },
  participant: {
    path: path.join(__dirname, "../assets/masks/participant.png"),
    scale: 1,
  },
  organizer: {
    path: path.join(__dirname, "../assets/masks/organizer.png"),
    scale: 1,
  },
};
