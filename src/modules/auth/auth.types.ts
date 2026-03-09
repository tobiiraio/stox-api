export type RequestOtpBody = {
  email: string;
};

export type VerifyOtpBody = {
  email: string;
  shopId: string;
  code: string;
};

export type RefreshTokenBody = {
  refreshToken: string;
};

export type RequestOtpResult =
  | {
      mode: "OTP_SENT";
      shop: {
        shopId: string;
        name: string;
      };
    }
  | {
      mode: "SELECT_SHOP";
      shops: Array<{
        shopId: string;
        name: string;
      }>;
    };