export function translateAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('rate limit')) {
    return 'Hai fatto troppi tentativi in poco tempo. Aspetta qualche minuto e riprova.';
  }
  if (normalized.includes('invalid') && normalized.includes('otp')) {
    return 'Codice non valido o scaduto. Controlla di averlo copiato bene o richiedine uno nuovo.';
  }
  if (normalized.includes('token has expired')) {
    return 'Il codice è scaduto. Richiedine uno nuovo.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Devi prima confermare la tua email con il codice che ti abbiamo inviato.';
  }
  if (normalized.includes('invalid login credentials')) {
    return 'Email o password non corrette.';
  }
  if (normalized.includes('user already registered') || normalized.includes('already registered')) {
    return 'Esiste già un account con questa email. Prova ad accedere.';
  }
  if (normalized.includes('password') && normalized.includes('at least')) {
    return 'La password deve essere di almeno 6 caratteri.';
  }
  if (normalized.includes('email') && normalized.includes('invalid')) {
    return "L'indirizzo email non sembra valido.";
  }
  if (normalized.includes('network')) {
    return 'Problema di connessione. Controlla la rete e riprova.';
  }
  return message;
}
