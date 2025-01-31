import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as kms from "aws-cdk-lib/aws-kms";
import * as rds from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";

export class InstanceProfileStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a new IAM Role
    const ec2BastionRole = new iam.Role(this, "EC2BastionRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"), // EC2 as the Principal
      description: "Role for EC2 bastion instances",
    });

    // Attach policies to the role (if needed)
    ec2BastionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonSSMManagedInstanceCore",
      ),
    );

    // Attach CloudWatchLogsFullAccess for storing access logs
    ec2BastionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLogsFullAccess"),
    );

    // Create the instance profile and associate the role
    const instanceProfile = new iam.CfnInstanceProfile(
      this,
      "InstanceProfile",
      {
        roles: [ec2BastionRole.roleName],
        instanceProfileName: "EC2BastionInstanceProfile",
      },
    );

    // Create a CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, "SSMSessionLogGroup", {
      logGroupName: "/ssm/ec2/session",
      retention: logs.RetentionDays.ONE_WEEK, // Retention period of 7 days
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Optional: Removes the log group when the stack is deleted
    });

    // Create a VPC for the instance
    const vpc = new ec2.Vpc(this, "BastionVpc", {
      maxAzs: 2, // Default: 2 Availability Zones
    });

    // Create an EC2 instance
    const ec2Instance = new ec2.Instance(this, "BastionInstance", {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO,
      ), // Instance type
      machineImage: ec2.MachineImage.latestAmazonLinux2023(), // Latest Amazon Linux AMI
      vpc, // Attach instance to the VPC
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }, // Use private subnets
      role: ec2BastionRole, // Assign the role to the instance
    });

    // Set the instance profile explicitly (optional, if needed for external tools)
    ec2Instance.instance.iamInstanceProfile = instanceProfile.ref;

    // secret key for DB
    const postgresSecret = new Secret(this, `test-DBCredentialsSecret`, {
      secretName: `test-db-credentials`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: "postgres",
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: "password",
      },
    });

    // Connection security group
    const dbsg = new ec2.SecurityGroup(this, "DatabaseSecurityGroup", {
      vpc: vpc,
      description: id + "Database",
      securityGroupName: id + "Database",
    });

    dbsg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      "allow Postgres access from Bastion Server",
    );

    // DB setups
    const engine = rds.DatabaseInstanceEngine.postgres({
      version: rds.PostgresEngineVersion.VER_15_7,
    });

    const instanceType = ec2.InstanceType.of(
      ec2.InstanceClass.BURSTABLE3,
      ec2.InstanceSize.MICRO,
    );
    const backupRetentionDays = 7;
    // Retain logs for 10 years in prod, 1 week in dev
    const cloudwatchLogsRetention = logs.RetentionDays.ONE_DAY;
    const monitoringInterval = cdk.Duration.seconds(60);
    const multiAz = false;
    const dbName = "TestDB";

    const kmsKey = new kms.Key(this, "PgDatabaseKey", {
      enableKeyRotation: true,
      alias: dbName,
    });
    const rdsInstance = new rds.DatabaseInstance(this, "PgDatabase", {
      engine,
      credentials: rds.Credentials.fromSecret(postgresSecret),
      backupRetention: cdk.Duration.days(backupRetentionDays),
      storageEncrypted: true,
      storageEncryptionKey: kmsKey,
      deletionProtection: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      copyTagsToSnapshot: true,
      allowMajorVersionUpgrade: true,
      autoMinorVersionUpgrade: true,
      monitoringInterval,
      enablePerformanceInsights: true,
      performanceInsightRetention: 7,
      cloudwatchLogsExports: ["postgresql"],
      cloudwatchLogsRetention,
      instanceIdentifier: dbName,
      instanceType,
      caCertificate: rds.CaCertificate.RDS_CA_RSA4096_G1,
      multiAz,
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      securityGroups: [dbsg],
      // https://hasura.io/blog/aws-aurora-is-it-for-you
      // Public access: Yes
      // — We’re going to need the database cluster to be publicly accessible, so that Hasura Cloud is able to reach it.
      publiclyAccessible: true,
      iamAuthentication: true, // Enable IAM authentication
    });

    ec2BastionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["rds-db:connect"],
        resources: [
          `arn:aws:rds-db:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:dbuser:${rdsInstance.instanceResourceId}/dbuser`,
        ],
      }),
    );
    rdsInstance.grantConnect(ec2BastionRole);
  }
}
