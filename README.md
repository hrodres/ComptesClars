# ComptesClars

Eina web per calcular i repartir els costos d'una activitat col·lectiva entre els seus participants. Càlcul en temps real, sense registre, sense servidor.

Útil per a excursions, colònies, viatges de grup, esdeveniments, sopars col·lectius o qualsevol activitat on calgui dividir costos.

🔗 **[comptesclars.pages.dev](https://comptesclars.pages.dev)**

---

## Funcionalitats

- **Participants** — un o més grups amb nom i nombre (ex: Adults, Nens, Professors)
- **Costos** — conceptes amb icona, import i distribució visual proporcional
- **Recaptació** — ingressos i despeses per concepte, amb resultat net per fila
- **Quotes** — planificació amb toggle participant/projecte, saldo a favor desglossat per origen (recaptació / pagaments)
- **Hero** — preu per participant i totals del projecte, saldo pendent o a favor d'un cop d'ull
- **Compartir** — URL curta (via Cloudflare KV, 30 dies) per enviar per WhatsApp, Telegram o email
- **Exportar / Importar** — fitxer `.json` amb nom normalitzat i timestamp automàtics
- **Desfer** — eliminacions i reinici desables durant 5 segons
- **Reordenar** — drag & drop a totes les seccions
- **Mode fosc** — toggle manual al menú, respecta la preferència del sistema operatiu
- **Emmagatzematge local** — dades guardades automàticament al navegador (localStorage, sense cookies, sense registre)
- **Format català** — punt de milers i coma decimal (3.125,48 €)

---

## Ús

1. Obre [comptesclars.pages.dev](https://comptesclars.pages.dev)
2. Introdueix el nom de l'activitat, els participants, costos, recaptació i pagaments
3. Els càlculs s'actualitzen en temps real
4. Comparteix el resultat amb el botó d'enllaç (genera URL curta) o copia el resum formatat per WhatsApp

---

## Tecnologies

| | |
|---|---|
| Frontend | HTML5 + CSS3 + JavaScript vanilla |
| Icones | [Lucide](https://lucide.dev/) (CDN) |
| Estils | [Tailwind CSS](https://tailwindcss.com/) (CDN) + CSS propi |
| Tipografia | [DM Sans + DM Mono](https://fonts.google.com/) |
| Compressió URL | [LZString](https://pieroxy.net/blog/pages/lz-string/index.html) |
| URLs curtes | [Cloudflare Workers KV](https://developers.cloudflare.com/kv/) |
| Desplegament | [Cloudflare Pages](https://pages.cloudflare.com/) |

---

## Estructura

```
ComptesClars/
├── index.html          # Estructura HTML de l'app
├── app.js              # Lògica, càlculs i gestió d'estat
├── style.css           # Estils propis (variables, components, layout)
├── _headers            # Capçaleres HTTP per Cloudflare Pages
├── functions/
│   └── share/
│       ├── index.js    # POST /share — desa dades al KV, retorna ID
│       └── [id].js     # GET /share/:id — recupera dades del KV
└── README.md           # Aquest fitxer
```

---

## Desplegament propi

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

### Configurar URLs curtes (Cloudflare KV)

Per activar el botó de compartir amb URL curta:

1. **Workers & Pages → KV** → crea un namespace anomenat `COMPTESCLARS_SHARE`
2. **Workers & Pages → comptesclars → Settings → Functions → KV namespace bindings**
   - Variable name: `SHARE_KV`
   - KV namespace: `COMPTESCLARS_SHARE`

Els enllaços caduquen als 30 dies. Les claus es poden consultar directament al dashboard de Cloudflare.

---

## Privacitat

- Les dades s'emmagatzemen **únicament al navegador** de l'usuari (localStorage)
- No s'usen cookies de seguiment ni de sessió
- Els enllaços de compartició emmagatzemen les dades temporalment a Cloudflare KV (30 dies), sense cap identificador d'usuari

---

## Llicència

[MIT](LICENSE) · Fet per [@hrodres](https://github.com/hrodres)
