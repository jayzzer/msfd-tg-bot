import { FormatType } from "./format";
import { UserType } from "./userType";

export interface BotSession {
  imagePath: string;
  selectedType: UserType | null;
  selectedFormat: FormatType | null;
}

export interface OutputFormat {
  width: number;
  height: number;
}
