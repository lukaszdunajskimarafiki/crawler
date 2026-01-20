# Instrukcja Wdrożenia (Podman Compose)

Ta instrukcja jest dostosowana do specyficznego środowiska serwera VPS z systemem Debian i narzędziem `podman`.

## 1. Przygotowanie na serwerze

Zaloguj się na serwer (przez SSH) i wejdź do katalogu, gdzie chcesz trzymać projekt:
```bash
# Jeśli nie masz jeszcze katalogu
mkdir -p ~/crawler
cd ~/crawler
```

## 2. Przesyłanie plików

Musisz przesłać pliki aplikacji na serwer do katalogu `~/crawler`.
Wymagane pliki to:
- `package.json`
- `package-lock.json`
- `prisma/` (katalog)
- `pages/` (katalog)
- `styles/` (katalog)
- `lib/` (katalog)
- `public/` (katalog - jeśli istnieje)
- `next.config.js`
- `Dockerfile`
- `docker-compose.yml`

*Możesz to zrobić np. przeciągając pliki klienta SFTP (FileZilla) lub używając `scp` / `rsync`.*

## 3. Uruchomienie (Jedna komenda!)

Dzięki przygotowanemu plikowi `docker-compose.yml`, uruchomienie całej aplikacji wraz z bazą danych sprowadza się do jednej komendy.

Upewnij się, że jesteś w katalogu z plikiem `docker-compose.yml` i wpisz:

```bash
podman-compose up -d --build
```

Co się stanie:
1.  Zostanie pobrany obraz PostgreSQL 16.
2.  Zostanie zbudowany obraz Twojej aplikacji (na bazie `node:18-alpine`).
3.  Zostanie utworzona baza danych i użytkownik.
4.  Aplikacja połączy się z bazą i wystartuje na porcie **3555**.

## 4. Sprawdzenie statusu

Aby sprawdzić, czy kontenery działają:
```bash
podman ps
```
Powinieneś widzieć dwa kontenery: `crawler-web` i `crawler-db`.

Aby zobaczyć logi aplikacji (np. czy nie ma błędów):
```bash
podman logs crawler-web
```

## 5. Wystawienie na świat

Aplikacja działa teraz na porcie **3555**. Zgodnie z instrukcją administratora serwera:
> "odpala aplikację na porcie 3555 - pisze do Ciebie/mnie wiadomość, że potrzebuje to wystawić na zewnątrz"

Napisz wiadomość do administratora:
*"Cześć, uruchomiłem aplikację na porcie 3555. Proszę o wystawienie jej na zewnątrz (Reverse Proxy)."*

## Notatki techniczne
- **Baza danych**: Dane są trwałe i zapisywane w katalogu Serwera: `~/crawler/postgres-data`.
- **Hasła**: Hasło do bazy w tej konfiguracji to `tajnehaslo`. Jeśli chcesz je zmienić, edytuj `docker-compose.yml` (sekcje `POSTGRES_PASSWORD` oraz `DATABASE_URL`) PRZED uruchomieniem.
