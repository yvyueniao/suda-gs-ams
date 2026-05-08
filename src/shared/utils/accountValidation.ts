const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_11_DIGITS_REGEX = /^\d{11}$/;
const HAS_DIGIT_REGEX = /\d/;
const UPPER_REGEX = /[A-Z]/;
const LOWER_REGEX = /[a-z]/;
const NUMBER_REGEX = /\d/;
const SPECIAL_REGEX = /[^A-Za-z0-9]/;

export const INIT_EMAIL = "init@qq.com";

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(String(email ?? "").trim());
}

export function isValidUsername11Digits(username: string): boolean {
  return USERNAME_11_DIGITS_REGEX.test(String(username ?? "").trim());
}

export function hasDigitInName(name: string): boolean {
  return HAS_DIGIT_REGEX.test(String(name ?? "").trim());
}

export function getStrongPasswordError(password: string): string | null {
  const value = String(password ?? "");
  if (value.length < 8)
    return "密码长度至少 8 位，必须包含至少 1 个大写字母，1 个小写字母， 1 个数字， 1 个特殊字符";
  if (!UPPER_REGEX.test(value))
    return "密码长度至少 8 位，必须包含至少 1 个大写字母，1 个小写字母， 1 个数字， 1 个特殊字符";
  if (!LOWER_REGEX.test(value))
    return "密码长度至少 8 位，必须包含至少 1 个大写字母，1 个小写字母， 1 个数字， 1 个特殊字符";
  if (!NUMBER_REGEX.test(value))
    return "密码长度至少 8 位，必须包含至少 1 个大写字母，1 个小写字母， 1 个数字， 1 个特殊字符";
  if (!SPECIAL_REGEX.test(value))
    return "密码长度至少 8 位，必须包含至少 1 个大写字母，1 个小写字母， 1 个数字， 1 个特殊字符";
  return null;
}
