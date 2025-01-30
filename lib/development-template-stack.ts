import { Construct } from "constructs";

import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";

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
  }
}
