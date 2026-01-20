# Wybieramy obraz bazowy Node.js
FROM node:18-alpine

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
