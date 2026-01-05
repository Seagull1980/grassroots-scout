# 🌐 External Access Setup Guide - Grassroots Hub

## 📊 **Current Server Status**
✅ **Backend Server**: Running on http://192.168.0.44:5000  
✅ **Frontend Server**: Running on http://192.168.0.44:5173  
✅ **Local Access**: http://localhost:5173 ✅  
✅ **Network Access**: http://192.168.0.44:5173 ✅  

## 🏠 **Your Network Information**
- **Local IP**: 192.168.0.44
- **Public IP**: 80.6.220.75
- **Gateway**: 192.168.0.1

## 🚀 **Quick Test URLs**

### **For You (Local)**
- **Website**: http://localhost:5173
- **API**: http://localhost:5000

### **For People on Your WiFi**
- **Website**: http://192.168.0.44:5173
- **API**: http://192.168.0.44:5000

## 🌍 **Setting Up External Access (For People Outside Your Network)**

### **Step 1: Router Configuration**
You need to configure port forwarding on your router (192.168.0.1):

1. **Access Router Admin Panel**:
   - Open browser and go to: http://192.168.0.1
   - Login with your router credentials

2. **Set Up Port Forwarding**:
   - Look for "Port Forwarding" or "Virtual Server" section
   - Add these rules:

   ```
   Rule 1 - Frontend:
   External Port: 8080
   Internal IP: 192.168.0.44
   Internal Port: 5173
   Protocol: TCP
   
   Rule 2 - Backend:
   External Port: 8081
   Internal IP: 192.168.0.44
   Internal Port: 5000
   Protocol: TCP
   ```

### **Step 2: Windows Firewall (Optional)**
Allow inbound connections:
```powershell
# Run these commands as Administrator
netsh advfirewall firewall add rule name="Grassroots Hub Frontend" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="Grassroots Hub Backend" dir=in action=allow protocol=TCP localport=5000
```

### **Step 3: External URLs**
After setting up port forwarding, share these URLs:

- **Website**: http://80.6.220.75:8080
- **API**: http://80.6.220.75:8081

## 🔧 **Alternative: Quick External Access (ngrok)**

If you want immediate external access without router configuration:

### **Install ngrok**
```powershell
# Download ngrok from https://ngrok.com/download
# Or use chocolatey: choco install ngrok
```

### **Expose Frontend**
```powershell
ngrok http 5173
```

### **Expose Backend (in another terminal)**
```powershell
ngrok http 5000
```

This will give you public URLs like:
- `https://abc123.ngrok.io` (Frontend)
- `https://def456.ngrok.io` (Backend)

## 📱 **Testing Checklist**

### **Local Testing**
- [ ] Open http://localhost:5173
- [ ] Register new user account
- [ ] Test all 7 growth features:
  - [ ] Alert Preferences (/alert-preferences)
  - [ ] Recommendations (/recommendations)
  - [ ] Enhanced Search (/enhanced-search)
  - [ ] Enhanced Dashboard (/enhanced-dashboard)
  - [ ] Social Sharing (buttons throughout site)
  - [ ] Email notifications (check Gmail)
  - [ ] User engagement tracking

### **Network Testing**
- [ ] From another device on WiFi: http://192.168.0.44:5173
- [ ] Test mobile responsiveness
- [ ] Test all user flows

### **External Testing**
- [ ] Configure router port forwarding
- [ ] Test from external network: http://80.6.220.75:8080
- [ ] Or use ngrok for immediate access

## 🎯 **Key Features to Demonstrate**

### **New Growth Features**
1. **Smart Alerts**: Users can customize notification preferences
2. **AI Recommendations**: Personalized content based on user behavior
3. **Advanced Search**: Filters, history, and saved searches
4. **Analytics Dashboard**: User engagement metrics and insights
5. **Social Sharing**: Share opportunities across platforms
6. **Email System**: Automated notifications and weekly digests
7. **Mobile Optimization**: Enhanced mobile experience

### **Core Platform Features**
- User registration/login (Coach, Player, Parent/Guardian)
- Team vacancy posting and management
- Player availability posting
- Advanced search and filtering
- Calendar integration
- Maps functionality
- Profile management

## 🚨 **Troubleshooting**

### **Cannot Access Locally**
- Check if servers are running: `netstat -ano | findstr ":5173"`
- Restart servers if needed

### **Cannot Access from Network**
- Verify IP address: `ipconfig`
- Check Windows Firewall settings
- Ensure Vite config has `host: '0.0.0.0'`

### **Cannot Access Externally**
- Verify router port forwarding configuration
- Check ISP doesn't block the ports
- Use ngrok as alternative

### **API Errors**
- Check backend server logs
- Verify CORS configuration
- Ensure database is accessible

## 📞 **Quick Commands**

### **Check Server Status**
```powershell
netstat -ano | findstr ":5173"  # Frontend
netstat -ano | findstr ":5000"  # Backend
```

### **Restart Servers**
```powershell
# Backend
cd "backend"; npm start

# Frontend (in new terminal)
cd ".."; npm run dev
```

### **Test Email Service**
```powershell
cd backend; npm run test:email
```

---

**🎉 Your Grassroots Hub is ready for comprehensive testing with all growth features!**
