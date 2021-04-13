module github.com/kubeflow/kubeflow/components/access-management

go 1.15

require (
	github.com/gorilla/mux v1.7.3
	github.com/kubeflow/kubeflow/components/profile-controller v0.0.0-20210409093503-8a1259928981
	github.com/prometheus/client_golang v1.7.1
	github.com/sirupsen/logrus v1.6.0
	istio.io/api v0.0.0-20201106165940-bf3d17a4caa7
	istio.io/client-go v0.0.0-20200908160912-f99162621a1a
	k8s.io/api v0.19.3
	k8s.io/apimachinery v0.19.3
	k8s.io/client-go v0.19.3
	sigs.k8s.io/controller-runtime v0.6.3
)
