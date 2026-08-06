import { TextInput, type TextInputProps } from "react-native";

/**
 * Default typing field: no auto-capitalization / auto-correct so users can
 * type freely (passwords, prompts, captions, comments, etc.).
 */
export function FloralyTextInput({
  autoCapitalize = "none",
  autoCorrect = false,
  spellCheck = false,
  ...props
}: TextInputProps) {
  return (
    <TextInput
      {...props}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      spellCheck={spellCheck}
    />
  );
}
