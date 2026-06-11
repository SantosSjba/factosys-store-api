export type StoreCustomerActor = {
  kind: 'customer';
  userId: string;
};

export type StoreGuestActor = {
  kind: 'guest';
  guestToken: string;
};

export type StoreActor = StoreCustomerActor | StoreGuestActor;
