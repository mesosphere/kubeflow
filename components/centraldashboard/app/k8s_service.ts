import * as k8s from '@kubernetes/client-node';

/** Information about the Kubernetes hosting platform. */
export interface PlatformInfo {
  provider: string;
  providerName: string;
  kubeflowVersion: string;
}

interface V1BetaOperator {
  kind: string;
  name: string;
}

interface V1BetaOperatorVersionSpec {
  appVersion: string;
  operator: V1BetaOperator;
}

/** Generic definition of the OperatorVersion CRD */
interface V1BetaOperatorVersion {
  apiVersion: string;
  kind: string;
  metadata?: k8s.V1ObjectMeta;
  spec: V1BetaOperatorVersionSpec;
}

interface V1BetaOperatorVersionList {
  items: V1BetaOperatorVersion[];
}

const OPERATOR_VERSION_API_GROUP = 'kudo.dev';
const OPERATOR_VERSION_API_VERSION = 'v1beta1';
const OPERATOR_VERSION_API_NAME = 'operatorversions';

/** Wrap Kubernetes API calls in a simpler interface for use in routes. */
export class KubernetesService {
  private namespace = 'kubeflow';
  private coreAPI: k8s.Core_v1Api;
  private customObjectsAPI: k8s.Custom_objectsApi;

  constructor(private kubeConfig: k8s.KubeConfig) {
    console.info('Initializing Kubernetes configuration');
    this.kubeConfig.loadFromDefault();
    const context =
        this.kubeConfig.getContextObject(this.kubeConfig.getCurrentContext());
    if (context && context.namespace) {
      this.namespace = context.namespace;
    }
    this.coreAPI = this.kubeConfig.makeApiClient(k8s.Core_v1Api);
    this.customObjectsAPI =
        this.kubeConfig.makeApiClient(k8s.Custom_objectsApi);
  }

  /** Retrieves the list of namespaces from the Cluster. */
  async getNamespaces(): Promise<k8s.V1Namespace[]> {
    try {
      const {body} = await this.coreAPI.listNamespace();
      return body.items;
    } catch (err) {
      console.error('Unable to fetch Namespaces:', err.body || err);
      return [];
    }
  }

  /** Retrieves the list of events for the given Namespace from the Cluster. */
  async getEventsForNamespace(namespace: string): Promise<k8s.V1Event[]> {
    try {
      const {body} = await this.coreAPI.listNamespacedEvent(namespace);
      return body.items;
    } catch (err) {
      console.error(
          `Unable to fetch Events for ${namespace}:`, err.body || err);
      return [];
    }
  }

  /**
   * Obtains cloud platform information from cluster Nodes,
   * as well as the Kubeflow version from the Application custom resource.
   */
  async getPlatformInfo(): Promise<PlatformInfo> {
    try {
      const [provider, version] =
          await Promise.all([this.getProvider(), this.getKubeflowVersion()]);
      return {
        kubeflowVersion: version,
        provider,
        providerName: provider.split(':')[0]
      };
    } catch (err) {
      console.error('Unexpected error', err);
      throw err;
    }
  }

  /**
   * Retrieves Kubernetes Node information.
   */
  async getNodes(): Promise<k8s.V1Node[]> {
    try {
      const {body} = await this.coreAPI.listNode();
      return body.items;
    } catch (err) {
      console.error('Unable to fetch Nodes', err.body || err);
      return [];
    }
  }

  /**
   * Returns the provider identifier or 'other://' from the K8s cluster.
   */
  private async getProvider(): Promise<string> {
    let provider = 'other://';
    try {
      const nodes = await this.getNodes();
      const foundProvider = nodes.map((n) => n.spec.providerID).find(Boolean);
      if (foundProvider) {
        provider = foundProvider;
      }
    } catch (err) {
      console.error('Unable to fetch Node information:', err.body || err);
    }
    return provider;
  }

  /**
   * Returns the Kubeflow version from the OperatorVersion custom resource or
   * 'unknown'.
   */
  private async getKubeflowVersion(): Promise<string> {
    let version = 'unknown';
    try {
      // tslint:disable-next-line: no-any
      const _ = (o: any) => o || {};
      const response = await this.customObjectsAPI.listNamespacedCustomObject(
          OPERATOR_VERSION_API_GROUP, OPERATOR_VERSION_API_VERSION, this.namespace, OPERATOR_VERSION_API_NAME);
      const body = response.body as V1BetaOperatorVersionList;
      const kubeflowOperatorVersion = (body.items || [])
        .find((app) =>
          /^kubeflow$/i.test(_(_(_(app).spec).operator).name)
        );
      if (kubeflowOperatorVersion) {
        version = kubeflowOperatorVersion.spec.appVersion;
      }
    } catch (err) {
      console.error('Unable to fetch OperatorVersion information:', err.body || err);
    }
    return version;
  }
}
