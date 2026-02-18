export const mockSession = {
  id: "user-1",
  email: "staff@mintvisionsoptique.com",
  name: "Staff User",
  role: "STAFF",
  mustChangePassword: false,
};

export const mockAdminSession = {
  ...mockSession,
  id: "user-admin",
  email: "admin@mintvisionsoptique.com",
  name: "Admin User",
  role: "ADMIN",
};
