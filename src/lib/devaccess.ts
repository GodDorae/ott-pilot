/**
 * /dev 접근 게이트.
 *
 * 개발 중에는 그냥 열리고, 배포 환경에서는 관리자 인증을 요구한다.
 * 미리보기가 조건을 임의로 지정할 수 있으므로 실제 참여자가 흘러들어오면 안 된다.
 */

import { isAdmin, verifyPassword } from "./adminauth";

export async function devAccessAllowed(key: string | null): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return true;
  if (await isAdmin()) return true;
  return verifyPassword(key);
}
