export const ADMIN_EMAILS = [
    "eduardo.rodrigues@syonet.com",
    "felipe.santos@syonet.com",
    "marina.vieira@syonet.com",
    "bruno.vilela@syonet.com"
  ];
  
  export function isAdmin(user) {
    return user && ADMIN_EMAILS.includes(user.email);
  }
  