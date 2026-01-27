// Supabase 错误码枚举
export enum SupabaseErrorCode {
  EMAIL_RATE_LIMIT_EXCEEDED = 'email rate limit exceeded',
  NEW_PASSWORD_SAME_AS_OLD = 'new password should be different from the old password',
  INVALID_LOGIN_CREDENTIALS = 'invalid login credentials',
  TOKEN_EXPIRED_OR_INVALID = 'token has expired or is invalid',
  // 在这里添加更多错误码
}

// 错误码到中文的映射
const errorMessageMap: Record<string, string> = {
  [SupabaseErrorCode.EMAIL_RATE_LIMIT_EXCEEDED]: '邮件发送过于频繁，请稍后再试',
  [SupabaseErrorCode.NEW_PASSWORD_SAME_AS_OLD]: '新密码不能与旧密码相同',
  [SupabaseErrorCode.INVALID_LOGIN_CREDENTIALS]: '邮箱或密码错误',
  [SupabaseErrorCode.TOKEN_EXPIRED_OR_INVALID]: '验证码已过期或无效，请重新获取',
  // 在这里添加更多错误码的中文翻译
}

/**
 * 将 Supabase 错误翻译成中文
 * @param error - Supabase 错误对象或错误消息字符串
 * @returns 中文错误消息
 */
export const translateSupabaseError = (error: any): string => {
  if (!error) {
    return '操作失败，请重试'
  }

  // 如果 error 是字符串，直接查找
  const errorMessage = typeof error === 'string' ? error : error.message || error.error?.message || ''

  if (!errorMessage) {
    return '操作失败，请重试'
  }

  // 转换为小写进行匹配（不区分大小写）
  const lowerErrorMessage = errorMessage.toLowerCase()

  // 遍历错误码枚举，查找匹配的错误
  for (const value of Object.values(SupabaseErrorCode)) {
    if (lowerErrorMessage.includes(value.toLowerCase())) {
      return errorMessageMap[value] || errorMessage
    }
  }

  // 如果没有匹配到，返回原始错误消息
  return errorMessage
}
