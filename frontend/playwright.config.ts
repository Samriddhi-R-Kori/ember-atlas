import { defineConfig } from '@playwright/test'
const API = process.env.API_PORT ?? '8000', WEB = process.env.WEB_PORT ?? '5173'
export default defineConfig({
 testDir:'./tests',fullyParallel:false,
 use:{baseURL:`http://127.0.0.1:${WEB}`,headless:true,viewport:{width:1440,height:1000}},
 reporter:'list',timeout:45000,
 webServer:[
  {command:`../.venv/bin/python -m uvicorn app.main:app --app-dir ../backend --host 127.0.0.1 --port ${API}`,env:{PYTHONPATH:'..'},url:`http://127.0.0.1:${API}/api/health`,reuseExistingServer:true,timeout:30000},
  {command:'npm run dev',url:`http://127.0.0.1:${WEB}`,reuseExistingServer:true}
 ]
})
