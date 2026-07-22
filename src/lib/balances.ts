/**
 * Money Engine — calcolo saldi netti tra i membri di un viaggio (spec §4.9, §5.4).
 * Il saldo netto di un utente = totale pagato - totale dovuto (dalle sue quote).
 * Le transazioni di saldo vengono poi semplificate con un algoritmo greedy
 * (il debitore maggiore paga il creditore maggiore, ripetuto finché tutti a zero)
 * per minimizzare il numero di trasferimenti necessari a saldare il gruppo.
 */

export interface MemberBalance {
  userId: string;
  name: string;
  net: number; // positivo = deve ricevere, negativo = deve pagare
}

export interface SettlementTransaction {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}

const EPSILON = 0.01;

export function simplifyDebts(balances: MemberBalance[]): SettlementTransaction[] {
  const creditors = balances
    .filter((b) => b.net > EPSILON)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net - a.net);
  const debtors = balances
    .filter((b) => b.net < -EPSILON)
    .map((b) => ({ ...b, net: -b.net }))
    .sort((a, b) => b.net - a.net);

  const transactions: SettlementTransaction[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.net, creditor.net);

    if (amount > EPSILON) {
      transactions.push({
        fromUserId: debtor.userId,
        fromName: debtor.name,
        toUserId: creditor.userId,
        toName: creditor.name,
        amount: Math.round(amount * 100) / 100,
      });
    }

    debtor.net -= amount;
    creditor.net -= amount;

    if (debtor.net <= EPSILON) i += 1;
    if (creditor.net <= EPSILON) j += 1;
  }

  return transactions;
}
