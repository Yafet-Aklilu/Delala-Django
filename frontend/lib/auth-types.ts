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

/** Returned when Firebase identity is valid but Delala Profile is incomplete. */
export type ProfileCompletionNeeded = {
  needsProfileCompletion: true;
  email: string;
  firebase_uid: string;
  errors?: AuthErrors;
};

export type GoogleAuthResult =
  | AuthSuccess
  | AuthFailure
  | ProfileCompletionNeeded;

export type CompleteFirebaseProfilePayload = {
  user_type: UserType;
  username: string;
  phone_no: string;
  first_name?: string;
  last_name?: string;
};
