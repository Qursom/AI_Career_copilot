import { describe, expect, it } from "vitest";
import {
  MSG_LINK_TIED_TO_OTHER_ACCOUNT,
  MSG_SIGN_IN_EMAIL_NOT_REGISTER,
  MSG_SIGN_IN_EMAIL_THEN_LINK_GOOGLE,
  MSG_SIGN_IN_GOOGLE_THEN_SET_PASSWORD,
  accountExistsDifferentCredentialMessage,
  formatSignedInWith,
  registerBlockedMessage,
  shouldBlockEmailRegister,
  shouldBlockGoogleSignIn,
} from "@/lib/auth-providers";
import { firebaseAuthMessage } from "@/lib/firebase";

describe("same-email provider policy", () => {
  it("blocks register when Google already owns the email", () => {
    expect(shouldBlockEmailRegister(["google.com"])).toBe(true);
    expect(registerBlockedMessage(["google.com"])).toBe(
      MSG_SIGN_IN_GOOGLE_THEN_SET_PASSWORD,
    );
  });

  it("blocks register when a password account already exists", () => {
    expect(shouldBlockEmailRegister(["password"])).toBe(true);
    expect(registerBlockedMessage(["password"])).toBe(
      MSG_SIGN_IN_EMAIL_NOT_REGISTER,
    );
  });

  it("allows register when Firebase reports no methods", () => {
    expect(shouldBlockEmailRegister([])).toBe(false);
  });

  it("blocks Google when the email is password-only", () => {
    expect(shouldBlockGoogleSignIn(["password"])).toBe(true);
    expect(shouldBlockGoogleSignIn(["password", "google.com"])).toBe(false);
    expect(shouldBlockGoogleSignIn([])).toBe(false);
  });

  it("tells Google users to use email first when methods are password-only", () => {
    expect(accountExistsDifferentCredentialMessage(["password"])).toBe(
      MSG_SIGN_IN_EMAIL_THEN_LINK_GOOGLE,
    );
  });

  it("formats linked providers without implying a merge", () => {
    expect(formatSignedInWith(["google.com"])).toBe("Google");
    expect(formatSignedInWith(["password"])).toBe("email");
    expect(formatSignedInWith(["google.com", "password"])).toBe(
      "Google and email",
    );
  });
});

describe("firebaseAuthMessage", () => {
  it("maps email-already-in-use to sign in with Google then set password", () => {
    expect(
      firebaseAuthMessage({ code: "auth/email-already-in-use" }, "email"),
    ).toBe(MSG_SIGN_IN_GOOGLE_THEN_SET_PASSWORD);
  });

  it("does not tell register-collision users to create another account", () => {
    const message = firebaseAuthMessage(
      { code: "auth/invalid-credential" },
      "email",
    );
    expect(message).not.toMatch(/Register first/i);
    expect(message).toMatch(/Google/i);
  });

  it("maps linking collisions to a no-merge message", () => {
    expect(
      firebaseAuthMessage({ code: "auth/credential-already-in-use" }, "link"),
    ).toBe(MSG_LINK_TIED_TO_OTHER_ACCOUNT);
    expect(
      firebaseAuthMessage({ code: "auth/provider-already-linked" }, "link"),
    ).toBe(MSG_LINK_TIED_TO_OTHER_ACCOUNT);
  });
});
