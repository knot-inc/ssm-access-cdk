#!/bin/bash -e
# Install psql

sudo dnf install postgresql15 -y

# Create a script to login psql
HOME=/home/ssm-user
sudo touch /home/ssm-user/psql-login.sh
sudo cat <<EOF > /home/ssm-user/psql-login.sh
#!/bin/bash
RDSHOST="DBNAME!!!.us-west-2.rds.amazonaws.com"
PGPASSWORD="\$(aws rds generate-db-auth-token --hostname \$RDSHOST --port 5432 --region us-west-2 --username dbuser)"
if [ -z "\$PGPASSWORD" ]; then
    echo "Failed to generate DB auth token."
    exit 1
fi
psql "host=\$RDSHOST port=5432 dbname=postgres user=dbuser password=\$PGPASSWORD"
EOF

sudo chmod +x /home/ssm-user/psql-login.sh

sudo touch /home/ssm-user/setup-bastion.sh
sudo cat <<EOF > /home/ssm-user/setup-bastion.sh
#!/bin/bash
# Install nodejs https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-up-node-on-ec2-instance.html

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
cd /home/ssm-user
source ~/.bashrc
nvm install --lts

node -e "console.log('Running Node.js ' + process.version)"

# PNPM for initiating CDK
# using curl to install fails for some reason, just use npm to install pnpm
npm install -g pnpm
pnpm add -g dotenv-cli
source ~/.bashrc
EOF

sudo chmod +x /home/ssm-user/setup-bastion.sh
