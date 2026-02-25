# Wybieramy obraz bazowy Node.js (Debian-based for Prisma compatibility)
FROM node:18-slim

# Instalujemy zależności systemowe wymagane przez Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Ustawiamy katalog roboczy
WORKDIR /app

# Kopiujemy pliki zależności
COPY package*.json ./
COPY prisma ./prisma/

# Instalujemy zależności
RUN npm install

# Kopiujemy resztę plików aplikacji
COPY . .

# Generujemy klienta Prisma
RUN npx prisma generate

# Budujemy aplikację do produkcji
RUN npm run build

# Eksponujemy port 3000 (wewnętrzny port kontenera)
EXPOSE 3000

# Komenda uruchomienia
CMD ["npm", "start"]
