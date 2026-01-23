declare module '@microlink/react-json-view' {
  import { ComponentType } from 'react';
  interface ReactJsonViewProps {
    src: any;
    name?: string | false;
    theme?: string | object;
    iconStyle?: 'circle' | 'triangle';
    displayDataTypes?: boolean;
    style?: React.CSSProperties;
    collapsed?: number | boolean;
    collapseStringsAfterLength?: number;
    enableClipboard?: boolean;
    displayObjectSize?: boolean;
    indentWidth?: number;
  }
  const ReactJsonView: ComponentType<ReactJsonViewProps>;
  export default ReactJsonView;
}
