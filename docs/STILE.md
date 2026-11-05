# Stile TDS (tds-ui.css)

Il sistema grafico condiviso delle app TDS: un solo file `tds-ui.css` con colori, tipografia e componenti, senza librerie esterne. Il font Inter si carica da Google Fonts.
Prima app che lo usa: Order App (novembre 2026). Le altre app passano a questo stile una alla volta; fino ad allora restano su `tokens.css` + `components.css`.

## Come si usa

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="tds-ui.css">   <!-- app Next: import "tds-ui/tds-ui.css" -->
```

Regola d'oro: tutto è una classe `.tds-*`. Il file non ridefinisce tabelle, titoli o paragrafi "nudi", così i documenti stampati che una pagina disegna al suo interno (PO, fatture…) mantengono il loro aspetto.

## Colori (variabili CSS)

| Uso | Variabile | Valore |
|---|---|---|
| Barra superiore (testo bianco) | `--tds-bar` | #1F3A6E |
| Link non attivi sulla barra | `--tds-bar-link` | #D6E0F5 |
| Primario: pulsanti, link, tab attivo | `--tds-primary` / `--tds-primary-hover` | #2457C5 / #1A3F94 |
| Riga o voce selezionata | `--tds-primary-soft` | #E8EFFC |
| Sfondo pagina / card | `--tds-page` / `--tds-surface` | #F3F5F9 / #FFFFFF |
| Bordo card / bordo input | `--tds-card-border` / `--tds-input-border` | #E1E6EF / #CDD4E0 |
| Testo / secondario / attenuato | `--tds-ink` / `--tds-ink-2` / `--tds-ink-3` | #1A2233 / #3D4656 / #5A6478 |
| Campo calcolato | `--tds-computed` | #EEF1F6, senza bordo |
| Commissioni | `--tds-commission` | #5B3DB5 |

**Stati** (sfondo badge / testo / barra):

| Stato | Quando | Sfondo | Testo | Barra |
|---|---|---|---|---|
| neutro | nuovo, non applicabile | #EEF0F4 | #3D4656 | — |
| info / in corso | lavorazione, spedito, da incassare | #E3EEFF | #1D4FA8 | #2F6BDB |
| attenzione | in attesa, parziale, da completare | #FFF1DC | #8A4B00 | #D98A1C |
| positivo | consegnato, pagato | #E1F4EA | #17663F | #2E9A5E |
| critico | scaduto, annullato, errore | #FDECEC | #A31F1F | — (forte: sfondo #A31F1F, testo bianco) |

Tutti i testi hanno un contrasto di almeno 4.5:1 sul loro sfondo. Non usare il colore come unica informazione: il badge ha sempre anche il testo.

## Tipografia

Inter 400/500/600/700. Titolo pagina 24px/700 (`.tds-h-page`) · titolo ordine 22px/700 (`.tds-h-order`) · titolo sezione 16px/700 (`.tds-h-section`) · testo 14px · secondario 13px (`.tds-text-2`, `.tds-muted`) · etichette campo 12px/600 (`.tds-label`) · intestazioni tabella 11px/700 maiuscolo, spaziatura 0.04em. I numeri vanno a destra con cifre a larghezza fissa (`.tds-num`, `td.n`).

## Forme e spaziature

Card raggio 10px e bordo 1px · pulsanti raggio 8px · input raggio 6px e altezza 38px · badge raggio 12px · aree cliccabili alte almeno 44px su touch. Spaziature 8 / 12 / 16 / 20 / 24 (`--tds-s1`…`--tds-s5`).

## Componenti: quando usare cosa

| Componente | Classe | Quando |
|---|---|---|
| Barra superiore | `.tds-bar` + `.tds-bar-brand`, `.tds-bar-nav`, `.tds-bar-link`, `.tds-bar-end`, `.tds-save`, `.tds-bar-icon` | In ogni app, in alto e fissa: logo "TDS", nome app, sezioni dell'app, stato di salvataggio (`data-state="ok|busy|error"`), ⚙ Impostazioni, "← Hub", "Esci". Su telefono la navigazione va su una seconda riga e scorre di lato. |
| Pulsanti | `.tds-button` + `-primary` / `-danger` / `-ghost` / `-sm` / `-icon` | Un solo primario per area (es. "Salva", "+ Nuovo ordine"). Le azioni distruttive vanno in rosso e chiedono conferma. |
| Campo | `.tds-field` > `.tds-label` + `.tds-input` | Ogni campo da compilare: etichetta sopra, input bianco con bordo. |
| Campo calcolato | `.tds-computed` | Valori che l'app calcola (totali, margini): grigio, senza bordo, non modificabile. |
| Griglia campi | `.tds-grid`, `.tds-span-2`, `.tds-span-all` | Moduli: le colonne si impilano da sole sullo schermo stretto. |
| Card | `.tds-panel` + `.tds-panel-head` / `.tds-panel-body` | Raggruppa i campi di un argomento. |
| Card KPI | `.tds-kpi` + `-info` / `-warn` / `-ok` / `-bad` / `-comm`, `.is-active` | Numeri di sintesi. Se è un `<button>` filtra la tabella; `.is-active` quando il filtro è applicato. |
| Badge di stato | `.tds-badge` + `-info` / `-warn` / `-ok` / `-bad` / `-bad-strong` / `-comm`, `.tds-badge-dot` | Stato di ordine, pagamento, controllo. Se è un `<button>` mostra ▾ e apre un menu. |
| Barra di avanzamento | `.tds-progress` + `-warn` / `-ok` / `-bad` / `-neutral` | Sotto il badge di stato o per incassato/pagato. |
| Chip documento | `.tds-doc` (in `.tds-docs`) | Accanto a un campo, per dire su quali documenti stampa: PO, PI, CI, PL, DN, CN. Come `<button aria-pressed>` diventa un interruttore. |
| Chip filtro | `.tds-chip` (con `<button>×</button>`) | Filtro attivo, rimovibile, accanto al titolo della tabella. |
| Aiuto | `.tds-info` con `data-tip="…"` e `tabindex="0"` | Al posto dei paragrafi di spiegazione: icona "i" con tooltip (anche da tastiera). |
| Controllo segmentato | `.tds-seg` con `<button aria-pressed>` | Scelte esclusive di 2–4 opzioni sempre visibili (Per unità / Per cartone). |
| Tab | `.tds-tabs` > `.tds-tab.active`, `.tds-dot-warn` | Sezioni di una scheda. Tab attivo: testo #1F3A6E grassetto e sottolineatura 3px #2457C5. Il pallino arancione segnala qualcosa da completare. |
| Menu | `.tds-menu` > `.tds-menu-list` > `.tds-menu-item` (`.is-danger`), `.tds-menu-sep` | Azioni secondarie ("Documenti ▾", "⋯"). |
| Percorso a tappe | `.tds-steps` > `.tds-step.done` / `.now` | Avanzamento cliccabile di un ordine. |
| Testata fissa | `.tds-sticky-head` | Intestazione di una scheda che resta visibile scorrendo. |
| Barra totali | `.tds-totalbar` > `.tds-totalbar-item` (`span` etichetta + `b` valore; `.is-pos` / `.is-neg`) | Totali sempre visibili in fondo a una scheda (sfondo #1F3A6E). |
| Tabella | `.tds-table-wrap` > `.tds-table` | Elenchi: righe alternate, intestazione fissa; su telefono scorre di lato dentro il suo riquadro. |
| Banner | `.tds-banner-warn` / `-info` | Avvisi a tutta larghezza (sola lettura, conflitti, sessione scaduta). |
| Finestra | `.tds-modal` > `.tds-modal-box`, `.tds-modal-title`, `.tds-modal-actions` | Conferme e scelte che fermano il lavoro. |
| Stato vuoto | `.tds-empty` | Nessun risultato. |

## Telefono

Ogni schermata deve funzionare a 375px: niente scorrimento orizzontale della pagina, colonne che si impilano, tabelle larghe in `.tds-table-wrap`, aree cliccabili da 44px.
