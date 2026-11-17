# เว็บไซต์ห้อง ม.6/6 แผนการเรียน วิทย์-คณิต (APE) โรงเรียนขุขันธ์

## วิธีเปิดเว็บออนไลน์ฟรีผ่าน GitHub Pages

โปรเจกต์นี้ตั้งค่าไฟล์ GitHub Actions (`.github/workflows/deploy.yml`) และสคริปต์ดึงข้อมูล Canva อัตโนมัติไว้ให้เรียบร้อยแล้ว:

1. สร้าง Repository ใหม่บน [GitHub](https://github.com/new) (ตั้งเป็น **Public** เพื่อให้เปิด GitHub Pages ได้ฟรี)
2. อัปโหลดหรือ `git push` โค้ดทั้งหมดขึ้นไปที่ Branch `main`
3. เข้าไปที่หน้า Repository บน GitHub > แท็บ **Settings** > เมนูด้านซ้าย **Pages**
4. ในหัวข้อ **Build and deployment > Source** เลือกเป็น **`GitHub Actions`**
5. รอประมาณ 1–2 นาที ระบบจะดึงข้อมูลล่าสุดจาก Canva (`https://canva.link/forlinktoweb606`), build เว็บ และสร้างลิงก์ออนไลน์ `https://<ชื่อผู้ใช้>.github.io/<ชื่อ-repo>/` ให้ทันที

### การอัปเดตข้อมูลจาก Canva บน GitHub
- ระบบ GitHub Actions จะรันอัปเดตข้อมูล Canva ให้อัตโนมัติ **ทุกๆ 2 ชั่วโมง**
- หรือกดเข้าแท็บ **Actions** > **Deploy M.6/6 APE Website to GitHub Pages** > **Run workflow** เพื่อสั่งดึงข้อมูลใหม่ทันทีได้ทุกเมื่อ
