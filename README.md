A poc for accessing Bastion server using SSM, then login to Postgre RDS using IAM Role

![image](https://github.com/user-attachments/assets/d5d1071b-dd04-4cac-ae56-2326b313fba0)

# Demo

https://github.com/user-attachments/assets/5a52f4bc-cacd-4d32-bc6f-6ff0237d1943



# Setup

```
pnpm i
touch .env
```

Add `CDK_ACCOUNT` and `CDK_REGION` to .env file 

# Deploy

```
pnpm cdk synth
pnpm cdk deploy --profile={your aws account}
```
