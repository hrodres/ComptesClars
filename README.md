# Excursió 6è 2026 · Càlcul de costos

Eina web per calcular el cost per família de l'excursió de 6è, amb repartiment de costos en temps real, recaptació i planificació de pagaments.

## 🚀 Deploy a Vercel (en 3 passos)

### 1. Pujar a GitHub

```bash
git init
git add .
git commit -m "feat: càlcul de costos excursió 6è"
git branch -M main
git remote add origin https://github.com/EL_TEU_USUARI/excursio-6e.git
git push -u origin main
```

### 2. Connectar amb Vercel

1. Ves a [vercel.com](https://vercel.com) i inicia sessió (pots usar el teu compte de GitHub).
2. Clica **"Add New Project"**.
3. Selecciona el repositori `excursio-6e`.
4. Vercel detecta automàticament que és un projecte estàtic.
5. Clica **"Deploy"** — en menys de 30 segons tindrà una URL pública.

### 3. Actualitzacions automàtiques

Cada `git push` a la branca `main` re-deploya automàticament. Cap configuració addicional.

---

## 📁 Estructura del projecte

```
excursio-6e/
├── index.html      # L'aplicació completa (HTML + CSS + JS)
├── vercel.json     # Configuració de Vercel
├── README.md       # Aquest fitxer
└── CHANGELOG.md    # Registre de canvis i versions
```

## ✨ Funcionalitats

- **Càlcul en temps real** — tots els camps s'actualitzen instantàniament.
- **Format català** — punt de milers i coma decimal (3.125,48 €).
- **Cookies de preferències** — desa els valors de l'usuari durant 365 dies.
  - Banner de consentiment en el primer accés (RGPD compliant).
  - L'usuari pot acceptar o declinar.
  - Si declina, els valors no es guarden mai.
  - Botó discret per canviar la preferència en qualsevol moment.
- **Valors per defecte a 0** — cap dada prefixada, l'usuari introdueix els seus números.
- **Avís d'excedent** — si la recaptació supera el cost, s'avisa amb tó positiu (no d'error).
- **Distribució de costos** — barra visual proporcional per categoria.
- **Accessible** — tots els inputs tenen `aria-label` i `<label>` associat.
- **Touch-friendly** — zones tàctils mínimes de 52px d'alçada.

## 🍪 Política de cookies

Només s'usen **cookies de preferències** (first-party), que guarden localment al navegador de l'usuari:
- Nombre d'alumnes
- Total recaptat
- Costos de serveis (allotjament, monitors, transport)
- Import del 1r pagament

No es transmeten dades a cap servidor extern. No s'usen cookies de seguiment ni publicitat.

## 🛠 Tecnologies

- HTML5 + CSS3 + JavaScript Vanilla
- [Tailwind CSS](https://tailwindcss.com/) (CDN)
- [Lucide Icons](https://lucide.dev/) (CDN)
- [DM Sans + DM Mono](https://fonts.google.com/) (Google Fonts)

## 📄 Llicència

Ús intern escolar. Sense llicència comercial.
