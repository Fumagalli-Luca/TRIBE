/**
 * Le date dei viaggi sono stringhe "YYYY-MM-DD" e vengono parsate da
 * `new Date(...)` come mezzanotte UTC. "Oggi" costruito con `new Date()` +
 * `setHours(0,0,0,0)` è invece mezzanotte nel fuso ORARIO LOCALE — i due non
 * coincidono per chi vive in un fuso diverso da UTC, sballando i confronti
 * (es. un viaggio che inizia oggi risultava "upcoming" invece di "ongoing").
 * Questa funzione restituisce "oggi" allo stesso modo (mezzanotte UTC della
 * data odierna locale), da usare ovunque si confronti con start_date/end_date.
 */
export function todayAsUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}
