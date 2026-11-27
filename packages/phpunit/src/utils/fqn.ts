export const splitFQN = (fqn: string): { namespace: string; className: string } => {
    const parts = fqn.split('\\');
    const className = parts.pop() ?? '';
    return { namespace: parts.join('\\'), className };
};
