export type UserType = "owner" | "customer";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: UserType | null;
  phone_no: string | null;
};

export type AuthErrors = Record<string, string>;

export type AuthSuccess = {
  user: AuthUser;
  redirect: string;
};

export type AuthFailure = {
  errors: AuthErrors;
};
