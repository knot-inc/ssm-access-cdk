A poc for accessing Bastion server using SSM, then login to Postgre RDS using IAM Role

![image](https://github.com/user-attachments/assets/d5d1071b-dd04-4cac-ae56-2326b313fba0)


https://github.com/user-attachments/assets/6472026c-1fca-4022-a217-92b09569d665



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
