# Build ClinicPro Desktop App (.exe)

## Requirements
- Node.js 18+ installed on your PC
- npm or pnpm

## Steps to build .exe

1. Clone or download this repo to your PC
2. Open terminal/command prompt in the project folder
3. Run:

```bash
npm install
npm run dist
```

4. The .exe installer will be created in the `release/` folder
5. Double-click the installer to install ClinicPro on your PC
6. ClinicPro will appear on your desktop

## Data Storage
- All data is stored permanently in your PC's local storage
- Data survives restarts, shutdowns
- Use Daily Report → Backup to export your data as JSON

## Run without building (development)
```bash
npm install
npm run electron
```
