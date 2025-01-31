#!/bin/bash -e
# Install psql

sudo dnf install postgresql15 -y

# Create a script to login psql
cat <<EOF > /home/ssm-user/psql-login.sh
#!/bin/bash
RDSHOST="DBNAME!!!.us-west-2.rds.amazonaws.com"
PGPASSWORD="\$(aws rds generate-db-auth-token --hostname \$RDSHOST --port 5432 --region us-west-2 --username dbuser)"
if [ -z "\$PGPASSWORD" ]; then
    echo "Failed to generate DB auth token."
    exit 1
fi
psql "host=\$RDSHOST port=5432 dbname=postgres user=dbuser password=\$PGPASSWORD"
EOF

chmod +x /home/ssm-user/psql-login.sh
