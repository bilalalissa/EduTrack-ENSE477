# Detailed Technical Documentation - EduTrack Network Configuration

## Initial Setup and Configuration

### Environment Details
- OS: macOS (darwin 24.3.0)
- Web Server: Apache (XAMPP)
- Application Path: `/Applications/XAMPP/xamppfiles/htdocs/EduTrack`
- Shell: /bin/zsh

## Issues Encountered and Solutions

### 1. IP Address Access Issue
#### Problem
- Application accessible via localhost but returned "Empty reply from server" when accessed via IP address (192.168.0.249)
- curl exit code 52 when attempting to access via IP

#### Diagnosis Steps
1. Tested PHP functionality:
   ```bash
   curl -v http://192.168.0.249/EduTrack/test.php -H "Host: 192.168.0.249"
   ```
2. Checked virtual hosts configuration
3. Verified Apache listening configuration
4. Tested firewall settings

#### Solution
1. Modified Apache configuration (`/Applications/XAMPP/xamppfiles/etc/httpd.conf`):
   ```apache
   Listen 127.0.0.1:80
   Listen 192.168.0.249:80
   ```
2. Enabled virtual hosts configuration by uncommenting:
   ```apache
   Include etc/extra/httpd-vhosts.conf
   ```

### 2. Virtual Host Configuration
#### Problem
- 403 Forbidden errors when accessing via localhost
- Inconsistent behavior between localhost and IP access

#### Solution
Modified `/Applications/XAMPP/xamppfiles/etc/extra/httpd-vhosts.conf`:
```apache
<VirtualHost 127.0.0.1:80 192.168.0.249:80>
    ServerAdmin webmaster@localhost
    DocumentRoot "/Applications/XAMPP/xamppfiles/htdocs"
    ServerName localhost
    ServerAlias localhost 127.0.0.1 192.168.0.249
    <Directory "/Applications/XAMPP/xamppfiles/htdocs">
        Options Indexes FollowSymLinks Includes ExecCGI
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

### 3. Testing and Verification
#### Test Commands
```bash
sudo /Applications/XAMPP/xamppfiles/xampp restart
curl -v http://localhost/EduTrack/test2.php
curl -v http://192.168.0.249/EduTrack/test2.php
```

#### Success Criteria
- HTTP 200 OK response from both localhost and IP address
- Correct content delivery ("Hello World!" test page)
- Proper logging in access_log

## Best Practices and Recommendations

### Security Considerations
1. Always use specific IP addresses in VirtualHost configurations
2. Implement proper directory permissions
3. Use SSL for production environments

### Maintenance
1. Regular monitoring of Apache error logs
2. Check PHP error logs for application issues
3. Keep XAMPP and PHP versions updated

### Troubleshooting Tools
1. curl for HTTP request testing
2. Apache error and access logs
3. PHP error logs
4. Network connectivity tests

## Additional Notes
- Configuration changes require Apache restart
- Test both localhost and IP access after changes
- Monitor logs for unexpected behavior
- Keep backup copies of working configurations 