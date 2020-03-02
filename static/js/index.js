let timeouts = [];

function updateDonations() {
    $.ajax({
        url: `/donations?stopcache=${new Date()}`,
        success: data => {
            $('#error-message').html('');
            data.forEach(donation => {
                if ($('#table-body').find(`#${donation.pk}`).length >= 1) {
                    return;
                }
                const timestamp = new Date(donation.fields.timereceived);
                const tr = `
                    <tr id=${donation.pk}>
                        <td>${timestamp.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</td>
                        <td>${donation.fields.donor__public}</td>
                        <td>${donation.fields.amount}</td>
                        <td>${donation.fields.comment.length === 0 ? '<i>absent</i>' : donation.fields.comment}
                        <td id='buttons'>
                            <Button id='${donation.pk}-1' onclick="action('read', '${donation.pk}');">Mark as read</Button>
                            <Button id='${donation.pk}-2' onclick="action('approve', '${donation.pk}');">Approve Comment</Button>
                            <Button id='${donation.pk}-3' onclick="action('deny', '${donation.pk}');">Reject Comment</Button>
                        </td>
                    </tr>`;

                $('#table-body').append(tr);
            });

        },
        timeout: 2300
    })
        .fail(() => {
            $('#error-message').html('Couldn\'t fetch donations. Yell at tech for help.');
        });
}

function updateBids() {
    $.ajax({
        url: `/bids?stopcache=${new Date()}`,
        success: data => {
            $('#error-message').html('');
            data.forEach(bid => {
                if ($('#table-body-bids').find(`#${bid.pk}`).length >= 1) {
                    return;
                }
                console.log(bid);
                const tr = `
                    <tr id=${bid.pk}>
                        <td>${bid.fields.parent__name}</td>
                        <td>${bid.fields.name}</td>
                        <td id='buttons'>
                            <Button id='${bid.pk}-2' onclick="action('bid-approve', '${bid.pk}');">Approve Bid</Button>
                            <Button id='${bid.pk}-3' onclick="action('bid-deny', '${bid.pk}');">Reject Bid</Button>
                        </td>
                    </tr>`;

                $('#table-body-bids').append(tr);
            });

        },
        timeout: 2300
    })
        .fail(() => {
            $('#error-message').html('Couldn\'t fetch donations. Yell at tech for help.');
        });
}


$(() => {
    console.log('ready');
    updateDonations();
    updateBids();
    setInterval(updateDonations, 5000);
    setInterval(updateBids, 5000);
});

function action(type, id) {
    $.get(`http://localhost:8080/edit?id=${id}&action=${type}`, () => {
        const el = $(`#${id}>#buttons`).html();
        const to = setTimeout(() => {
            $(`#${id}`).remove();
            console.log('removing');
        }, 5000);

        timeouts.push({ id, to, el });

        $(`#${id}>#buttons`).empty().html(`<Button onclick='cancelRemove(${id})'>Revert</Button>`);
    });
}

function cancelRemove(id) {
    console.log(id);
    console.log(timeouts);
    const i = timeouts.findIndex(element => element.id === id.toString());

    if (i !== -1) {
        clearTimeout(timeouts[i].to);

        $.get(`http://localhost:8080/edit?id=${id}&action=revert`);

        $(`#${id}>#buttons`).empty().html(timeouts[i].el);
    }
}
