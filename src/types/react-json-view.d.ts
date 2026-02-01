declare module 'react-json-view' {
  import { ComponentType } from 'react';
  interface ReactJsonViewProps {
    src: any;
    name?: string | false;
    theme?: string | object;
    iconStyle?: 'circle' | 'triangle';
    displayDataTypes?: boolean;
    style?: React.CSSProperties;
  }
  const ReactJsonView: ComponentType<ReactJsonViewProps>;
  export default ReactJsonView;
}
