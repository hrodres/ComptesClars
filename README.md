# ComptesClars

Eina web per calcular i repartir els costos d'una activitat col·lectiva entre els seus participants. Càlcul en temps real, sense registre, sense servidor.

Útil per a excursions, colònies, viatges de grup, esdeveniments, sopars col·lectius o qualsevol activitat on calgui dividir costos.

🔗 **[comptesclars.pages.dev](https://comptesclars.pages.dev)**

---

## Funcionalitats

- **Participants** — un o més grups amb nom i nombre (ex: Adults, Nens, Professors)
- **Costos** — conceptes amb icona, import i distribució visual proporcional
- **Recaptació** — ingressos i despeses per concepte, amb resultat net per fila
- **Pagaments** — planificació per participant, amb total de projecte calculat automàticament
- **Hero** — preu per participant, pendent, planificat i estalvi d'un cop d'ull
- **Compartir** — URL comprimit amb totes les dades per enviar per WhatsApp o email
- **Exportar / Importar** — fitxer `.json` amb nom normalitzat i timestamp automàtics
- **Desfer** — eliminacions i reinici desables durant 5 segons
- **Reordenar** — drag & drop a totes les seccions
- **Emmagatzematge local** — dades guardades automàticament al navegador (localStorage, sense cookies, sense registre)
- **Format català** — punt de milers i coma decimal (3.125,48 €)

---

## Ús

És una web estàtica, no cal instal·lar res:

1. Obre [comptesclars.pages.dev](https://comptesclars.pages.dev)
2. Introdueix el nom de l'activitat, els participants, costos, recaptació i pagaments
3. Els càlculs s'actualitzen en temps real
4. Comparteix el resultat amb el botó d'enllaç o copia el resum formatat per WhatsApp

---

## Tecnologies

| | |
|---|---|
| Frontend | HTML5 + CSS3 + JavaScript vanilla |
| Icones | [Lucide](https://lucide.dev/) (CDN) |
| Estils | [Tailwind CSS](https://tailwindcss.com/) (CDN) + CSS propi |
| Tipografia | [DM Sans + DM Mono](https://fonts.google.com/) |
| Compressió URL | [LZString](https://pieroxy.net/blog/pages/lz-string/index.html) |
| Desplegament | [Cloudflare Pages](https://pages.cloudflare.com/) |

---

## Estructura

```
ComptesClars/
├── index.html      # Estructura HTML de l'app
├── app.js          # Lògica, càlculs i gestió d'estat
├── style.css       # Estils propis (variables, components, layout)
├── _headers        # Capçaleres HTTP per Cloudflare Pages
└── README.md       # Aquest fitxer
```

---

## Desplegament propi

L'app és estàtica: cap backend, cap build step.

```bash
git clone https://github.com/hrodres/ComptesClars.git
cd ComptesClars
# Obre index.html directament al navegador
# o serveix amb qualsevol servidor estàtic
```

Per desplegar a **Cloudflare Pages**:
1. Connecta el repositori a Cloudflare Pages
2. Framework preset: `None`
3. Build command: *(buit)*
4. Output directory: `/`

Cada `git push` a `main` redesplega automàticament.

---

## Privacitat

- Les dades s'emmagatzemen **únicament al navegador** de l'usuari (localStorage)
- No s'usen cookies de seguiment ni de sessió
- No es transmeten dades a cap servidor extern
- L'URL de compartició conté les dades codificades al propi URL, sense cap servidor intermediari

---

## Llicència

[MIT](LICENSE) · Fet per [@hrodres](https://github.com/hrodres)
