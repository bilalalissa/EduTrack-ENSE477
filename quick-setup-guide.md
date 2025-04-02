# Quick Setup Guide for EduTrack Local Network Access

## Regular Setup Steps

1. Install XAMPP
2. Place EduTrack in `/Applications/XAMPP/xamppfiles/htdocs/`
3. Start XAMPP services (Apache, MySQL)
4. Access via:
   - Localhost: `http://localhost/EduTrack`
   - Network: `http://YOUR_IP_ADDRESS/EduTrack`

## Common Issues & Quick Fixes

### Empty Server Reply
If getting "Empty reply from server" when accessing via IP:
1. Edit `/Applications/XAMPP/xamppfiles/etc/httpd.conf`
2. Add:
   ```apache
   Listen 127.0.0.1:80
   Listen YOUR_IP_ADDRESS:80
   ```

### 403 Forbidden Error
If getting "Forbidden" error:
1. Edit `/Applications/XAMPP/xamppfiles/etc/extra/httpd-vhosts.conf`
2. Add:
   ```apache
   <VirtualHost *:80>
       DocumentRoot "/Applications/XAMPP/xamppfiles/htdocs"
       ServerName localhost
       ServerAlias localhost YOUR_IP_ADDRESS
       <Directory "/Applications/XAMPP/xamppfiles/htdocs">
           Require all granted
       </Directory>
   </VirtualHost>
   ```

### After Configuration Changes
Always:
1. Save all configuration files
2. Restart XAMPP: `sudo /Applications/XAMPP/xamppfiles/xampp restart`
3. Test both localhost and IP access 