import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Alert } from './Alert.js';
import { Button } from './Button.js';
import { EmptyState } from './EmptyState.js';
import { Field } from './Field.js';
import { Card } from './Card.js';
import { Input, Select, TextArea } from './controls.js';
import { SegmentedControl } from './SegmentedControl.js';
import { Spinner } from './Spinner.js';

describe('Button', () => {
  it('es de tipo button por defecto: uno sin tipo dentro de un form lo enviaria', () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveAttribute('type', 'button');
  });

  it('no dispara el click cuando esta deshabilitado', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Nueva marca
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Spinner', () => {
  it('anuncia que esta cargando sin ocupar espacio visible con el texto', () => {
    render(<Spinner label="Cargando tus miras" />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando tus miras');
  });
});

describe('Alert', () => {
  it('interrumpe con role alert cuando es un error', () => {
    render(<Alert tone="danger">No pudimos guardar la marca.</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('muestra el codigo para que el usuario pueda compartirlo con soporte', () => {
    render(<Alert code="BS-MARK-409-002">La marca cae fuera de la escala.</Alert>);
    expect(screen.getByText('BS-MARK-409-002')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('ofrece una salida: un vacio sin accion es un callejon', () => {
    render(
      <EmptyState
        title="Todavia no tenes miras"
        description="Crea una para empezar a cargar marcas."
        action={<Button tone="accent">Nueva mira</Button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Nueva mira' })).toBeInTheDocument();
  });
});

describe('Field', () => {
  it('asocia el label, la ayuda y el error con el control', () => {
    render(
      <Field label="Distancia" hint="En metros" error="Tiene que ser mayor que 0" required>
        {(aria) => <Input {...aria} />}
      </Field>,
    );

    const input = screen.getByLabelText(/Distancia/);
    expect(input).toHaveAccessibleDescription('En metros Tiene que ser mayor que 0');
    expect(input).toBeInvalid();
    expect(input).toBeRequired();
  });

  it('sin error, el control no queda marcado como invalido', () => {
    render(<Field label="Marca de mira">{(aria) => <Input {...aria} />}</Field>);
    expect(screen.getByLabelText('Marca de mira')).toBeValid();
  });
});

describe('SegmentedControl', () => {
  it('usa radios nativos, asi el teclado y el lector de pantalla funcionan solos', () => {
    render(
      <SegmentedControl
        label="Set de flechas"
        value="vap"
        onChange={() => {}}
        options={[
          { value: 'vap', label: 'VAP V1' },
          { value: 'gt', label: 'Gold Tip' },
        ]}
      />,
    );

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'VAP V1' })).toBeChecked();
  });

  it('avisa que set eligio el arquero', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Set de flechas"
        value="vap"
        onChange={onChange}
        options={[
          { value: 'vap', label: 'VAP V1' },
          { value: 'gt', label: 'Gold Tip' },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole('radio', { name: 'Gold Tip' }));
    expect(onChange).toHaveBeenCalledWith('gt');
  });
});

describe('accesibilidad', () => {
  it('un formulario completo no tiene violaciones', async () => {
    const { container } = render(
      <form>
        <Field label="Distancia" hint="En metros" required>
          {(aria) => <Input {...aria} type="number" />}
        </Field>
        <SegmentedControl
          label="Set de flechas"
          value="vap"
          onChange={() => {}}
          options={[{ value: 'vap', label: 'VAP V1' }]}
        />
        <Button tone="accent">Guardar</Button>
      </form>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Card', () => {
  it('marca con borde punteado lo que todavia no esta confirmado', () => {
    const { container, rerender } = render(<Card>Marca calculada</Card>);
    expect(container.firstElementChild).not.toHaveClass('border-dashed');

    rerender(<Card dashed>Marca calculada</Card>);
    expect(container.firstElementChild).toHaveClass('border-dashed');
  });
});

describe('TextArea y Select', () => {
  it('la nota queda asociada a su label', () => {
    render(
      <Field label="Notas" hint="Viento, indoor, etc.">
        {(aria) => <TextArea {...aria} />}
      </Field>,
    );
    const textarea = screen.getByLabelText('Notas');
    expect(textarea).toHaveAccessibleDescription('Viento, indoor, etc.');
  });

  it('el set de flechas se elige por su label', async () => {
    const onChange = vi.fn();
    render(
      <Field label="Set de flechas" required>
        {(aria) => (
          <Select {...aria} defaultValue="vap" onChange={(e) => onChange(e.target.value)}>
            <option value="vap">VAP V1</option>
            <option value="gt">Gold Tip</option>
          </Select>
        )}
      </Field>,
    );

    await userEvent.selectOptions(screen.getByLabelText(/Set de flechas/), 'gt');
    expect(onChange).toHaveBeenCalledWith('gt');
  });
});
