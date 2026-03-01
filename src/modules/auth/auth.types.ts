export type RequestOtpBody = {
  email: string;
  shopId: string; // tenant context (frontend should send it or you derive it)
};

export type VerifyOtpBody = {
  email: string;
  shopId: string;
  code: string;
};