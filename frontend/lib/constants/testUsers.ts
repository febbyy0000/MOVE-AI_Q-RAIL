// TODO: 로그인 기능 붙으면 이 파일 전체를 실제 인증된 유저 정보로 교체
export type TestUser = {
  label: string;
  shipperId: string;
  company: string;
};

export const TEST_USERS: TestUser[] = [
  { label: "유저1", shipperId: "9f03f7a7-af0f-4263-b523-1d40c2a5565b", company: "테스트포워딩" },
  { label: "유저2", shipperId: "c388cd1c-5c35-4172-b107-b17ed1ca55b3", company: "현대글로비스" },
  { label: "유저3", shipperId: "28a34f72-1d71-4c0e-96f8-8104411937b4", company: "유신 포워딩" },
];

export const SELECTED_USER_STORAGE_KEY = "selectedTestUser";

export function getSelectedTestUser(): TestUser {
  if (typeof window === "undefined") return TEST_USERS[0];
  const savedLabel = window.localStorage.getItem(SELECTED_USER_STORAGE_KEY);
  return TEST_USERS.find((u) => u.label === savedLabel) ?? TEST_USERS[0];
}

export function setSelectedTestUser(label: string) {
  window.localStorage.setItem(SELECTED_USER_STORAGE_KEY, label);
}
