#!/bin/bash
set -o xtrace

# Configure EKS bootstrap
/etc/eks/bootstrap.sh ${cluster_name} \
  --b64-cluster-ca ${cluster_ca} \
  --apiserver-endpoint ${cluster_endpoint} \
  --kubelet-extra-args '--node-labels=node.kubernetes.io/lifecycle=normal'

# Configure CloudWatch agent
yum install -y amazon-cloudwatch-agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<EOF
{
  "metrics": {
    "namespace": "KnowledgeNetwork/EKS",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {
            "name": "cpu_usage_idle",
            "rename": "CPU_IDLE",
            "unit": "Percent"
          }
        ],
        "totalcpu": false
      },
      "disk": {
        "measurement": [
          {
            "name": "used_percent",
            "rename": "DISK_USED",
            "unit": "Percent"
          }
        ],
        "resources": [
          "/"
        ]
      },
      "mem": {
        "measurement": [
          {
            "name": "mem_used_percent",
            "rename": "MEM_USED",
            "unit": "Percent"
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent

# Configure log rotation
cat > /etc/logrotate.d/kubernetes <<EOF
/var/log/pods/*/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    maxage 30
}
EOF

# Optimize kernel parameters
cat >> /etc/sysctl.conf <<EOF
# Kubernetes optimizations
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.tcp_tw_reuse = 1
vm.max_map_count = 262144
fs.inotify.max_user_instances = 8192
fs.inotify.max_user_watches = 524288
EOF

sysctl -p

# Configure container runtime
cat > /etc/docker/daemon.json <<EOF
{
  "bridge": "none",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true,
  "max-concurrent-downloads": 10
}
EOF

systemctl restart docker

echo "EKS node bootstrap complete"