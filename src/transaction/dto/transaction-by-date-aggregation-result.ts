export interface TransactionByDateAggregationResult {
  _id: Date;
  transactions: Transaction[];
}

interface Transaction {
  _id: ID;
  createdAt: AtedAt;
  updatedAt: AtedAt;
  txHash: string;
  value: string;
  videoId: ID;
  fromId: ID;
  toId: ID;
  From: From;
  To: From;
  Video: any;
}

interface From {
  _id: ID;
  email: string;
  name: string;
  username: string;
  password: string;
  createdAt: AtedAt;
  updatedAt: AtedAt;
  version: DateClass;
  walletId: ID;
}

interface ID {
  $oid: string;
}

interface AtedAt {
  $date: DateClass;
}

interface DateClass {
  $numberLong: string;
}
