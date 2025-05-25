
# TODO:
- [ ] CronJob to refresh challenges at midnight
- [ ] Database Implimentation (save state)

---
# Deployment Info
service running on ec2
```
/etc/systemd/system/words-weave.service
```

to stop
```
sudo systemctl stop words-weave.service
```


to push and run
```
scp words-weave ec2-user@ec2-address:/home/ubuntu/bin/words-weave
ssh ec2-user@ec2-address "sudo systemctl restart your-app"
```


location: /etc/systemd/system/words-weave.service
```
[Unit]
Description=words weave app
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/bin
ExecStart=/home/ubuntu/bin/words-weave
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
