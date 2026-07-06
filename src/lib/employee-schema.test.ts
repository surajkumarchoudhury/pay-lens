import { describe, expect, it } from "vitest";

import {
  validateCompensationChange,
  validateEmployeeProfile,
  validateEmployeeRow,
} from "@/lib/employee-schema";

const validRow = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  gender: "FEMALE",
  title: "Engineer",
  level: "L3",
  status: "ACTIVE",
  isRemote: false,
  countryIso2: "US",
  departmentId: "dep_1",
  hireDate: "2020-01-01",
  dob: "",
  avatarUrl: "",
  currencyCode: "USD",
  frequencyId: "freq_1",
  annualBase: "100000",
  annualTotal: "120000",
  effectiveDate: "",
};

describe("validateEmployeeRow", () => {
  it("accepts a valid row", () => {
    expect(validateEmployeeRow(validRow)).toBeNull();
  });

  it("requires a first name", () => {
    const errors = validateEmployeeRow({ ...validRow, firstName: "  " });
    expect(errors?.firstName).toBe("First name is required");
  });

  it("rejects a malformed email", () => {
    const errors = validateEmployeeRow({ ...validRow, email: "not-an-email" });
    expect(errors?.email).toBe("Enter a valid email");
  });

  it("rejects total comp below base pay", () => {
    const errors = validateEmployeeRow({
      ...validRow,
      annualBase: "120000",
      annualTotal: "100000",
    });
    expect(errors?.annualTotal).toBe("Total comp can't be less than base pay");
  });

  it("rejects non-numeric pay", () => {
    const errors = validateEmployeeRow({ ...validRow, annualBase: "abc" });
    expect(errors?.annualBase).toBe("Enter a valid amount");
  });
});

describe("validateEmployeeProfile", () => {
  const validProfile = {
    employeeId: "emp_1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    gender: "FEMALE",
    title: "Engineer",
    level: "L3",
    status: "ACTIVE",
    isRemote: true,
    countryIso2: "US",
    departmentId: "dep_1",
    hireDate: "2020-01-01",
    dob: "",
    avatarUrl: "",
  };

  it("accepts a valid profile", () => {
    expect(validateEmployeeProfile(validProfile)).toBeNull();
  });

  it("flags an invalid hire date", () => {
    const errors = validateEmployeeProfile({
      ...validProfile,
      hireDate: "not-a-date",
    });
    expect(errors?.hireDate).toBe("Enter a valid date");
  });

  it("flags a bad avatar URL", () => {
    const errors = validateEmployeeProfile({
      ...validProfile,
      avatarUrl: "http://",
    });
    expect(errors?.avatarUrl).toBeTruthy();
  });
});

describe("validateCompensationChange", () => {
  it("accepts a valid change", () => {
    expect(
      validateCompensationChange({
        annualBase: "100000",
        annualTotal: "120000",
        effectiveDate: "",
      }),
    ).toBeNull();
  });

  it("rejects zero / negative base pay", () => {
    const errors = validateCompensationChange({
      annualBase: "0",
      annualTotal: "120000",
      effectiveDate: "",
    });
    expect(errors?.annualBase).toBe("Base pay must be greater than 0");
  });

  it("rejects total comp below base pay", () => {
    const errors = validateCompensationChange({
      annualBase: "120000",
      annualTotal: "100000",
      effectiveDate: "",
    });
    expect(errors?.annualTotal).toBe("Total comp can't be less than base pay");
  });

  it("rejects an invalid effective date", () => {
    const errors = validateCompensationChange({
      annualBase: "100000",
      annualTotal: "120000",
      effectiveDate: "13/40/2026",
    });
    expect(errors?.effectiveDate).toBe("Enter a valid date");
  });
});
